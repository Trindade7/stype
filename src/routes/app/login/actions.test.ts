import { describe, expect, it } from 'vitest';
import { initializeDatabase } from '$lib/server/db';
import { seedAdminUser } from '$lib/server/db/seed';
import * as schema from '$lib/server/db/schema';
import { SESSION_COOKIE_NAME } from '$lib/server/auth/session';
import { createLoginAction, createLogoutAction } from './auth-actions';
import type { RequestEvent } from '@sveltejs/kit';

describe('login and logout form actions', () => {
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

	it('authenticates admin with valid credentials and sets session cookie', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const loginAction = createLoginAction(db);
		const { event, getSetCookie } = createActionMockEvent({
			username: 'admin',
			password: 'admin123'
		});

		await expect(loginAction(event)).rejects.toMatchObject({
			status: 303,
			location: '/app'
		});

		const cookie = getSetCookie();
		expect(cookie).toBeDefined();
		expect(cookie?.name).toBe(SESSION_COOKIE_NAME);
		expect(cookie?.value).toBeTruthy();

		// Verify session in database
		const sessionsInDb = db.select().from(schema.sessions).all();
		expect(sessionsInDb.length).toBe(1);
		expect(sessionsInDb[0].id).toBe(cookie?.value);
	});

	it('authenticates user with valid email address and password and sets session cookie', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const loginAction = createLoginAction(db);
		const { event, getSetCookie } = createActionMockEvent({
			username: 'admin@stype.local',
			password: 'admin123'
		});

		await expect(loginAction(event)).rejects.toMatchObject({
			status: 303,
			location: '/app'
		});

		const cookie = getSetCookie();
		expect(cookie).toBeDefined();
		expect(cookie?.name).toBe(SESSION_COOKIE_NAME);
		expect(cookie?.value).toBeTruthy();

		// Verify session in database
		const sessionsInDb = db.select().from(schema.sessions).all();
		expect(sessionsInDb.length).toBe(1);
		expect(sessionsInDb[0].id).toBe(cookie?.value);
	});

	it('authenticates user when field name is identifier instead of username', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const loginAction = createLoginAction(db);
		const { event, getSetCookie } = createActionMockEvent({
			identifier: 'admin@stype.local',
			password: 'admin123'
		});

		await expect(loginAction(event)).rejects.toMatchObject({
			status: 303,
			location: '/app'
		});

		expect(getSetCookie()?.value).toBeTruthy();
	});

	it('fails with 400 when email does not exist', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const loginAction = createLoginAction(db);
		const { event, getSetCookie } = createActionMockEvent({
			username: 'nonexistent@stype.local',
			password: 'admin123'
		});

		const result: any = await loginAction(event);
		expect(result?.status).toBe(400);
		expect(result?.data?.message).toMatch(/invalid.*(username|email|password|credential)/i);
		expect(getSetCookie()).toBeNull();
	});

	it('fails with 400 when password is incorrect for email login', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const loginAction = createLoginAction(db);
		const { event, getSetCookie } = createActionMockEvent({
			username: 'admin@stype.local',
			password: 'wrongpassword'
		});

		const result: any = await loginAction(event);
		expect(result?.status).toBe(400);
		expect(result?.data?.message).toMatch(/invalid.*(username|email|password|credential)/i);
		expect(getSetCookie()).toBeNull();
	});

	it('fails with 400 when credentials are incorrect', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const loginAction = createLoginAction(db);
		const { event, getSetCookie } = createActionMockEvent({
			username: 'admin',
			password: 'wrongpassword'
		});

		const result: any = await loginAction(event);
		expect(result?.status).toBe(400);
		expect(result?.data?.message).toContain('Invalid username/email or password');
		expect(getSetCookie()).toBeNull();
	});

	it('fails with 400 when fields are missing', async () => {
		const { db } = initializeDatabase(':memory:');
		const loginAction = createLoginAction(db);
		const { event } = createActionMockEvent({
			username: '',
			password: ''
		});

		const result: any = await loginAction(event);
		expect(result?.status).toBe(400);
		expect(result?.data?.message).toContain('required');
	});

	it('logs out by invalidating session and deleting cookie', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		// First login
		const loginAction = createLoginAction(db);
		const { event: loginEvent, getSetCookie } = createActionMockEvent({
			username: 'admin',
			password: 'admin123'
		});

		await expect(loginAction(loginEvent)).rejects.toMatchObject({ status: 303 });
		const sessionId = getSetCookie()!.value;

		// Now logout
		const logoutAction = createLogoutAction(db);
		const { event: logoutEvent, getDeletedCookie } = createActionMockEvent({}, sessionId);
		logoutEvent.locals.session = { id: sessionId, userId: 'admin-id', createdAt: new Date(), expiresAt: new Date() };

		await expect(logoutAction(logoutEvent)).rejects.toMatchObject({
			status: 303,
			location: '/app/login'
		});

		expect(getDeletedCookie()).toBe(SESSION_COOKIE_NAME);
		const sessionsInDb = db.select().from(schema.sessions).all();
		expect(sessionsInDb.length).toBe(0);
	});
});
