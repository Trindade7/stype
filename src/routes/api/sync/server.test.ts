import { describe, expect, it, beforeEach } from 'vitest';
import { POST } from './+server';
import { initializeDatabase } from '$lib/server/db';
import { testRuns, users, passages, userSettings, sessions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as dbModule from '$lib/server/db';
import { vi } from 'vitest';

vi.mock('$lib/server/db', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/db')>('$lib/server/db');
	return {
		...actual,
		db: undefined
	};
});

describe('POST /api/sync', () => {
	let dbInstance: any;

	beforeEach(async () => {
		const { db } = initializeDatabase(':memory:');
		dbInstance = db;
		(dbModule as any).db = db;

		await db.insert(users).values({
			id: 'user-1',
			username: 'testuser',
			passwordHash: 'hash',
			createdAt: new Date()
		});

		await db.insert(userSettings).values({
			userId: 'user-1',
			mode: 'passage',
			duration: 30,
			passageLength: 'all',
			zenMode: false,
			theme: 'system',
			scrollMode: 'center',
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z')
		});

		await db.insert(passages).values({
			id: 'p-default',
			text: 'Default Passage',
			source: 'Test',
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z')
		});
	});

	it('returns 401 if unauthenticated', async () => {
		const req = new Request('http://localhost/api/sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({})
		});

		const res = await POST({
			request: req,
			locals: { user: null, session: null }
		} as any);

		expect(res.status).toBe(401);
	});

	it('authenticates via Authorization Bearer token header', async () => {
		await dbInstance.insert(sessions).values({
			id: 'valid-token-123',
			userId: 'user-1',
			expiresAt: new Date(Date.now() + 3600000),
			createdAt: new Date()
		});

		const req = new Request('http://localhost/api/sync', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer valid-token-123'
			},
			body: JSON.stringify({})
		});

		const res = await POST({
			request: req,
			locals: { user: { id: 'user-1' }, session: { id: 'valid-token-123' } }
		} as any);

		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.success).toBe(true);
		expect(json.syncedAt).toBeDefined();
	});

	it('merges test runs bidirectionally with append-only set union by UUID', async () => {
		// Existing server run
		await dbInstance.insert(testRuns).values({
			id: 'server-run-uuid-1',
			userId: 'user-1',
			passageId: 'p-default',
			mode: 'passage',
			duration: null,
			wpm: 85,
			accuracy: 97,
			timeElapsed: 25,
			correctChars: 120,
			incorrectChars: 2,
			extraChars: 0,
			missedChars: 0,
			timelineSnapshots: [],
			createdAt: new Date('2026-02-01T12:00:00.000Z')
		});

		const clientRun = {
			id: 'client-run-uuid-2',
			passageId: 'p-default',
			mode: 'timed',
			duration: 60,
			wpm: 110,
			accuracy: 98,
			timeElapsed: 60,
			correctChars: 550,
			incorrectChars: 3,
			extraChars: 1,
			missedChars: 0,
			timelineSnapshots: [],
			createdAt: '2026-02-02T12:00:00.000Z'
		};

		const req = new Request('http://localhost/api/sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				testRuns: [clientRun]
			})
		});

		const res = await POST({
			request: req,
			locals: { user: { id: 'user-1' }, session: {} }
		} as any);

		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.success).toBe(true);

		// Response should return server runs to the client
		expect(json.testRuns).toBeDefined();
		expect(json.testRuns.some((r: any) => r.id === 'server-run-uuid-1')).toBe(true);

		// Server should have stored client's run
		const serverRuns = await dbInstance.select().from(testRuns).all();
		expect(serverRuns.length).toBe(2);
		const foundClientRun = serverRuns.find((r: any) => r.id === 'client-run-uuid-2');
		expect(foundClientRun).toBeDefined();
		expect(foundClientRun.wpm).toBe(110);

		// Second sync with identical run should be idempotent
		const req2 = new Request('http://localhost/api/sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				testRuns: [clientRun]
			})
		});

		const res2 = await POST({
			request: req2,
			locals: { user: { id: 'user-1' }, session: {} }
		} as any);

		expect(res2.status).toBe(200);
		const serverRunsAfter = await dbInstance.select().from(testRuns).all();
		expect(serverRunsAfter.length).toBe(2);
	});

	it('resolves custom passages bidirectionally with last-write-wins and tombstones', async () => {
		// Server has passage 1 updated at 10:00
		await dbInstance.insert(passages).values({
			id: 'passage-1',
			text: 'Old server version',
			source: 'Server',
			userId: 'user-1',
			createdAt: new Date('2026-01-01T09:00:00.000Z'),
			updatedAt: new Date('2026-01-01T10:00:00.000Z')
		});

		// Server has passage 2 updated at 14:00 (newer than client's copy at 11:00)
		await dbInstance.insert(passages).values({
			id: 'passage-2',
			text: 'Server newer version',
			source: 'Server',
			userId: 'user-1',
			createdAt: new Date('2026-01-01T09:00:00.000Z'),
			updatedAt: new Date('2026-01-01T14:00:00.000Z')
		});

		const payload = {
			customPassages: [
				// Client updates passage 1 at 12:00 (client newer -> client wins)
				{
					id: 'passage-1',
					text: 'New client version',
					source: 'Client',
					createdAt: '2026-01-01T09:00:00.000Z',
					updatedAt: '2026-01-01T12:00:00.000Z'
				},
				// Client tries to overwrite passage 2 with older timestamp 11:00 (server newer -> server wins)
				{
					id: 'passage-2',
					text: 'Stale client version',
					source: 'Client',
					createdAt: '2026-01-01T09:00:00.000Z',
					updatedAt: '2026-01-01T11:00:00.000Z'
				},
				// Client creates brand new passage
				{
					id: 'passage-3',
					text: 'Brand new passage',
					source: 'Client',
					createdAt: '2026-01-01T15:00:00.000Z',
					updatedAt: '2026-01-01T15:00:00.000Z'
				}
			]
		};

		const req = new Request('http://localhost/api/sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		const res = await POST({
			request: req,
			locals: { user: { id: 'user-1' }, session: {} }
		} as any);

		expect(res.status).toBe(200);
		const json = await res.json();

		// Check server DB state
		const p1 = await dbInstance.select().from(passages).where(eq(passages.id, 'passage-1')).get();
		expect(p1.text).toBe('New client version'); // Client won

		const p2 = await dbInstance.select().from(passages).where(eq(passages.id, 'passage-2')).get();
		expect(p2.text).toBe('Server newer version'); // Server won

		const p3 = await dbInstance.select().from(passages).where(eq(passages.id, 'passage-3')).get();
		expect(p3.text).toBe('Brand new passage');

		// Check response returned to client
		expect(json.customPassages).toBeDefined();
		const returnedP2 = json.customPassages.find((p: any) => p.id === 'passage-2');
		expect(returnedP2).toBeDefined();
		expect(returnedP2.text).toBe('Server newer version');
	});

	it('propagates soft-delete tombstones across devices', async () => {
		// Server has active passage
		await dbInstance.insert(passages).values({
			id: 'passage-to-delete',
			text: 'Will be deleted',
			source: null,
			userId: 'user-1',
			createdAt: new Date('2026-01-01T09:00:00.000Z'),
			updatedAt: new Date('2026-01-01T09:00:00.000Z'),
			deletedAt: null
		});

		const deleteTime = '2026-01-01T16:00:00.000Z';
		const payload = {
			customPassages: [
				{
					id: 'passage-to-delete',
					text: 'Will be deleted',
					source: null,
					createdAt: '2026-01-01T09:00:00.000Z',
					updatedAt: deleteTime,
					deletedAt: deleteTime
				}
			]
		};

		const req = new Request('http://localhost/api/sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		const res = await POST({
			request: req,
			locals: { user: { id: 'user-1' }, session: {} }
		} as any);

		expect(res.status).toBe(200);

		// Passage on server is now soft-deleted
		const p = await dbInstance.select().from(passages).where(eq(passages.id, 'passage-to-delete')).get();
		expect(p.deletedAt).not.toBeNull();
		expect(p.deletedAt).toBeInstanceOf(Date);

		// Now simulate another device syncing without the tombstone: server should return tombstone
		const device2Req = new Request('http://localhost/api/sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({})
		});

		const device2Res = await POST({
			request: device2Req,
			locals: { user: { id: 'user-1' }, session: {} }
		} as any);

		const device2Json = await device2Res.json();
		const returnedTombstone = device2Json.customPassages.find((cp: any) => cp.id === 'passage-to-delete');
		expect(returnedTombstone).toBeDefined();
		expect(returnedTombstone.deletedAt).not.toBeNull();
	});

	it('resolves settings conflicts using last-write-wins based on updated_at', async () => {
		// Server settings updatedAt: 2026-01-01T00:00:00.000Z, mode: 'passage'
		// 1. Client sends newer settings (2026-01-02) -> client wins
		const req1 = new Request('http://localhost/api/sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				settings: {
					mode: 'timed',
					duration: 60,
					theme: 'dark',
					zenMode: true,
					updatedAt: '2026-01-02T00:00:00.000Z'
				}
			})
		});

		const res1 = await POST({
			request: req1,
			locals: { user: { id: 'user-1' }, session: {} }
		} as any);

		expect(res1.status).toBe(200);
		const json1 = await res1.json();
		expect(json1.settings.mode).toBe('timed');
		expect(json1.settings.theme).toBe('dark');

		const serverSettings1 = await dbInstance.select().from(userSettings).where(eq(userSettings.userId, 'user-1')).get();
		expect(serverSettings1.mode).toBe('timed');
		expect(serverSettings1.theme).toBe('dark');

		// 2. Client sends older settings (2026-01-01) -> server wins
		const req2 = new Request('http://localhost/api/sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				settings: {
					mode: 'passage',
					duration: 15,
					theme: 'light',
					updatedAt: '2026-01-01T12:00:00.000Z'
				}
			})
		});

		const res2 = await POST({
			request: req2,
			locals: { user: { id: 'user-1' }, session: {} }
		} as any);

		expect(res2.status).toBe(200);
		const json2 = await res2.json();
		// Server's 'timed' / 'dark' should have been preserved
		expect(json2.settings.mode).toBe('timed');
		expect(json2.settings.theme).toBe('dark');

		const serverSettings2 = await dbInstance.select().from(userSettings).where(eq(userSettings.userId, 'user-1')).get();
		expect(serverSettings2.mode).toBe('timed');
	});

	it('filters records using lastSyncedAt timestamp', async () => {
		// Add an older run (Jan) and a newer run (Feb)
		await dbInstance.insert(testRuns).values([
			{
				id: 'run-jan',
				userId: 'user-1',
				passageId: 'p-default',
				mode: 'passage',
				wpm: 70,
				accuracy: 95,
				timeElapsed: 20,
				correctChars: 100,
				incorrectChars: 5,
				extraChars: 0,
				missedChars: 0,
				createdAt: new Date('2026-01-15T00:00:00.000Z')
			},
			{
				id: 'run-feb',
				userId: 'user-1',
				passageId: 'p-default',
				mode: 'passage',
				wpm: 80,
				accuracy: 97,
				timeElapsed: 20,
				correctChars: 110,
				incorrectChars: 3,
				extraChars: 0,
				missedChars: 0,
				createdAt: new Date('2026-02-15T00:00:00.000Z')
			}
		]);

		const req = new Request('http://localhost/api/sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				lastSyncedAt: '2026-02-01T00:00:00.000Z'
			})
		});

		const res = await POST({
			request: req,
			locals: { user: { id: 'user-1' }, session: {} }
		} as any);

		expect(res.status).toBe(200);
		const json = await res.json();

		// Should only return run-feb, not run-jan
		const returnedRunIds = json.testRuns.map((r: any) => r.id);
		expect(returnedRunIds).toContain('run-feb');
		expect(returnedRunIds).not.toContain('run-jan');
	});
});
