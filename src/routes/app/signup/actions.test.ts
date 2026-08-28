import { describe, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { initializeDatabase } from '$lib/server/db';
import { seedAdminUser } from '$lib/server/db/seed';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { SESSION_COOKIE_NAME } from '$lib/server/auth/session';
import { verifyPassword } from '$lib/server/auth/password';
import { createSignupAction } from './signup-actions';

describe('signup form action', () => {
	function createActionMockEvent(formDataEntries: Record<string, string>, cookieVal?: string) {
		const formData = new FormData();
		for (const [key, val] of Object.entries(formDataEntries)) {
			formData.append(key, val);
		}

		let setCookieCall: { name: string; value: string; options?: any } | null = null;
		let deletedCookie: string | null = null;

		const cookies = {
			get: (name: string) => (name === SESSION_COOKIE_NAME ? cookieVal : undefined),
			set: (name: string, value: string, options?: any) => {
				setCookieCall = { name, value, options };
			},
			delete: (name: string) => {
				deletedCookie = name;
			}
		};

		const request = {
			formData: async () => formData
		} as unknown as Request;

		const event = {
			request,
			cookies,
			locals: { session: null, user: null }
		} as unknown as RequestEvent;

		return {
			event,
			getSetCookie: () => setCookieCall,
			getDeletedCookie: () => deletedCookie
		};
	}

	it('fails with 400 when display name is missing or empty', async () => {
		const { db } = initializeDatabase(':memory:');
		const signupAction = createSignupAction(db);
		const { event } = createActionMockEvent({
			name: '   ',
			username: 'newuser',
			email: 'newuser@example.com',
			password: 'password123'
		});

		const result: any = await signupAction(event);
		expect(result?.status).toBe(400);
		expect(result?.data?.message).toMatch(/name.*between 1 and 50/i);
		expect(result?.data?.username).toBe('newuser');
		expect(result?.data?.email).toBe('newuser@example.com');
		expect(result?.data?.password).toBeUndefined();
	});

	it('fails with 400 when display name exceeds 50 characters', async () => {
		const { db } = initializeDatabase(':memory:');
		const signupAction = createSignupAction(db);
		const { event } = createActionMockEvent({
			name: 'a'.repeat(51),
			username: 'newuser',
			email: 'newuser@example.com',
			password: 'password123'
		});

		const result: any = await signupAction(event);
		expect(result?.status).toBe(400);
		expect(result?.data?.message).toMatch(/name.*between 1 and 50/i);
		expect(result?.data?.name).toBe('a'.repeat(51));
	});

	it('fails with 400 when username is too short (< 3 chars)', async () => {
		const { db } = initializeDatabase(':memory:');
		const signupAction = createSignupAction(db);
		const { event } = createActionMockEvent({
			name: 'Test Typist',
			username: 'ab',
			email: 'test@example.com',
			password: 'password123'
		});

		const result: any = await signupAction(event);
		expect(result?.status).toBe(400);
		expect(result?.data?.message).toMatch(/username.*between 3 and 20/i);
		expect(result?.data?.name).toBe('Test Typist');
		expect(result?.data?.username).toBe('ab');
	});

	it('fails with 400 when username is too long (> 20 chars)', async () => {
		const { db } = initializeDatabase(':memory:');
		const signupAction = createSignupAction(db);
		const { event } = createActionMockEvent({
			name: 'Test Typist',
			username: 'a'.repeat(21),
			email: 'test@example.com',
			password: 'password123'
		});

		const result: any = await signupAction(event);
		expect(result?.status).toBe(400);
		expect(result?.data?.message).toMatch(/username.*between 3 and 20/i);
		expect(result?.data?.username).toBe('a'.repeat(21));
	});

	it('fails with 400 when username contains invalid characters', async () => {
		const { db } = initializeDatabase(':memory:');
		const signupAction = createSignupAction(db);
		const { event } = createActionMockEvent({
			name: 'Test Typist',
			username: 'invalid user!',
			email: 'test@example.com',
			password: 'password123'
		});

		const result: any = await signupAction(event);
		expect(result?.status).toBe(400);
		expect(result?.data?.message).toMatch(/username.*between 3 and 20/i);
		expect(result?.data?.username).toBe('invalid user!');
	});

	it('fails with 400 when email format is invalid', async () => {
		const { db } = initializeDatabase(':memory:');
		const signupAction = createSignupAction(db);
		const { event } = createActionMockEvent({
			name: 'Test Typist',
			username: 'validuser',
			email: 'not-an-email',
			password: 'password123'
		});

		const result: any = await signupAction(event);
		expect(result?.status).toBe(400);
		expect(result?.data?.message).toMatch(/email.*format|valid email/i);
		expect(result?.data?.name).toBe('Test Typist');
		expect(result?.data?.username).toBe('validuser');
		expect(result?.data?.email).toBe('not-an-email');
	});

	it('fails with 400 when password is fewer than 8 characters', async () => {
		const { db } = initializeDatabase(':memory:');
		const signupAction = createSignupAction(db);
		const { event } = createActionMockEvent({
			name: 'Test Typist',
			username: 'validuser',
			email: 'test@example.com',
			password: 'short'
		});

		const result: any = await signupAction(event);
		expect(result?.status).toBe(400);
		expect(result?.data?.message).toMatch(/password.*at least 8 characters/i);
		expect(result?.data?.name).toBe('Test Typist');
		expect(result?.data?.username).toBe('validuser');
		expect(result?.data?.email).toBe('test@example.com');
		expect(result?.data?.password).toBeUndefined();
	});

	it('fails with 400 when username is already taken', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const signupAction = createSignupAction(db);
		const { event } = createActionMockEvent({
			name: 'Another Admin',
			username: 'admin',
			email: 'different@example.com',
			password: 'password123'
		});

		const result: any = await signupAction(event);
		expect(result?.status).toBe(400);
		expect(result?.data?.message).toMatch(/username.*already (taken|in use|exists)/i);
		expect(result?.data?.name).toBe('Another Admin');
		expect(result?.data?.username).toBe('admin');
		expect(result?.data?.email).toBe('different@example.com');
		expect(result?.data?.password).toBeUndefined();
	});

	it('fails with 400 when email is already registered', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const signupAction = createSignupAction(db);
		const { event } = createActionMockEvent({
			name: 'Another User',
			username: 'anotheruser',
			email: 'admin@stype.local',
			password: 'password123'
		});

		const result: any = await signupAction(event);
		expect(result?.status).toBe(400);
		expect(result?.data?.message).toMatch(/email.*already (registered|in use|exists|taken)/i);
		expect(result?.data?.name).toBe('Another User');
		expect(result?.data?.username).toBe('anotheruser');
		expect(result?.data?.email).toBe('admin@stype.local');
		expect(result?.data?.password).toBeUndefined();
	});

	it('successfully registers a new user, hashes password with scrypt, sets session cookie, and redirects to /app', async () => {
		const { db } = initializeDatabase(':memory:');
		const signupAction = createSignupAction(db);
		const { event, getSetCookie } = createActionMockEvent({
			name: 'Jane Doe',
			username: 'janedoe',
			email: 'jane@example.com',
			password: 'securepassword123'
		});

		await expect(signupAction(event)).rejects.toMatchObject({
			status: 303,
			location: '/app'
		});

		const cookie = getSetCookie();
		expect(cookie).toBeDefined();
		expect(cookie?.name).toBe(SESSION_COOKIE_NAME);
		expect(cookie?.value).toBeTruthy();
		expect(cookie?.options?.httpOnly).toBe(true);
		expect(cookie?.options?.sameSite).toBe('lax');
		expect(cookie?.options?.path).toBe('/');

		// Verify user in database
		const userInDb = db.select().from(schema.users).where(eq(schema.users.username, 'janedoe')).get();
		expect(userInDb).toBeDefined();
		expect(userInDb?.name).toBe('Jane Doe');
		expect(userInDb?.username).toBe('janedoe');
		expect(userInDb?.email).toBe('jane@example.com');
		expect(userInDb?.role).toBe('user');
		expect(userInDb?.passwordHash).not.toBe('securepassword123');

		const isValidPassword = await verifyPassword('securepassword123', userInDb!.passwordHash);
		expect(isValidPassword).toBe(true);

		// Verify session in database
		const sessionInDb = db.select().from(schema.sessions).where(eq(schema.sessions.id, cookie!.value)).get();
		expect(sessionInDb).toBeDefined();
		expect(sessionInDb?.userId).toBe(userInDb!.id);
	});
});
