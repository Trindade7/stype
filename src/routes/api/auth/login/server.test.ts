import { describe, expect, it, beforeEach } from 'vitest';
import { POST } from './+server';
import { initializeDatabase } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
import { validateSession } from '$lib/server/auth/session';
import * as dbModule from '$lib/server/db';
import { vi } from 'vitest';

vi.mock('$lib/server/db', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/db')>('$lib/server/db');
	return {
		...actual,
		db: undefined
	};
});

describe('POST /api/auth/login', () => {
	let dbInstance: any;

	beforeEach(async () => {
		const { db } = initializeDatabase(':memory:');
		dbInstance = db;
		(dbModule as any).db = db;

		const passwordHash = await hashPassword('correct-password');
		await db.insert(users).values({
			id: 'u-1',
			username: 'alice',
			email: 'alice@example.com',
			name: 'Alice',
			role: 'user',
			passwordHash,
			createdAt: new Date()
		});
	});

	it('returns 400 when identifier or password is missing', async () => {
		const req = new Request('http://localhost/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: 'alice' })
		});

		const res = await POST({ request: req } as any);
		expect(res.status).toBe(400);
		const json = await res.json();
		expect(json.error).toBeDefined();
	});

	it('returns 401 when password is invalid', async () => {
		const req = new Request('http://localhost/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ identifier: 'alice', password: 'wrong-password' })
		});

		const res = await POST({ request: req } as any);
		expect(res.status).toBe(401);
		const json = await res.json();
		expect(json.error).toBe('Invalid credentials');
	});

	it('returns 401 when user is not found', async () => {
		const req = new Request('http://localhost/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ identifier: 'nobody', password: 'some-password' })
		});

		const res = await POST({ request: req } as any);
		expect(res.status).toBe(401);
	});

	it('returns 200 with session token and safe user on valid credentials', async () => {
		const req = new Request('http://localhost/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: 'alice', password: 'correct-password' })
		});

		const res = await POST({ request: req } as any);
		expect(res.status).toBe(200);
		const json = await res.json();

		expect(json.token).toBeDefined();
		expect(typeof json.token).toBe('string');
		expect(json.user).toEqual({
			id: 'u-1',
			username: 'alice',
			email: 'alice@example.com',
			name: 'Alice',
			role: 'user'
		});

		// Verify session token is valid in database
		const { session, user } = await validateSession(dbInstance, json.token);
		expect(session).not.toBeNull();
		expect(user?.id).toBe('u-1');
	});

	it('authenticates with email as identifier', async () => {
		const req = new Request('http://localhost/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ identifier: 'alice@example.com', password: 'correct-password' })
		});

		const res = await POST({ request: req } as any);
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.user.username).toBe('alice');
	});
});
