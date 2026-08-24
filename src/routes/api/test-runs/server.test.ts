import { describe, expect, it, beforeEach } from 'vitest';
import { POST } from './+server';
import { initializeDatabase } from '$lib/server/db';
import { testRuns, users, passages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as dbModule from '$lib/server/db';
import { vi } from 'vitest';

vi.mock('$lib/server/db', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/db')>('$lib/server/db');
	return {
		...actual,
		db: undefined // We will override this in beforeEach
	};
});

describe('POST /api/test-runs', () => {
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

		await db.insert(passages).values({
			id: 1,
			text: 'Test passage',
			source: 'Test',
			createdAt: new Date()
		});
	});

	it('returns 401 if not authenticated', async () => {
		const req = new Request('http://localhost/api/test-runs', {
			method: 'POST',
			body: JSON.stringify({})
		});
		
		const response = await POST({ request: req, locals: { user: null, session: null } } as any);
		expect(response.status).toBe(401);
	});

	it('returns 400 if payload is invalid', async () => {
		const req = new Request('http://localhost/api/test-runs', {
			method: 'POST',
			body: JSON.stringify({ wpm: 100 }) // Missing fields
		});
		
		const response = await POST({ 
			request: req, 
			locals: { user: { id: 'user-1' }, session: {} } 
		} as any);
		expect(response.status).toBe(400);
	});

	it('saves the test run and returns it', async () => {
		const payload = {
			passageId: 1,
			wpm: 80,
			accuracy: 95,
			timeElapsed: 30,
			correctChars: 200,
			incorrectChars: 5,
			extraChars: 0,
			missedChars: 0
		};

		const req = new Request('http://localhost/api/test-runs', {
			method: 'POST',
			body: JSON.stringify(payload)
		});

		const response = await POST({ 
			request: req, 
			locals: { user: { id: 'user-1' }, session: {} } 
		} as any);
		
		expect(response.status).toBe(200);
		const run = await response.json();
		expect(run.wpm).toBe(80);
		expect(run.accuracy).toBe(95);

		// Verify in DB
		const saved = await dbInstance.select().from(testRuns).where(eq(testRuns.id, run.id)).get();
		expect(saved).toBeDefined();
		expect(saved?.userId).toBe('user-1');
		expect(saved?.wpm).toBe(80);
	});
});
