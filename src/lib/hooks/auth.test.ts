import { describe, expect, it } from 'vitest';
import type { Handle, RequestEvent } from '@sveltejs/kit';
import { initializeDatabase } from '../server/db';
import { seedAdminUser } from '../server/db/seed';
import * as schema from '../server/db/schema';
import { eq } from 'drizzle-orm';
import { createSession, SESSION_COOKIE_NAME } from '../server/auth/session';
import { createAuthHandle } from './auth';

describe('auth server hook', () => {
	function createMockEvent(urlPath: string, cookieValue?: string): {
		event: RequestEvent;
		deletedCookies: string[];
	} {
		const deletedCookies: string[] = [];
		const cookies = {
			get: (name: string) => (name === SESSION_COOKIE_NAME ? cookieValue : undefined),
			delete: (name: string) => {
				deletedCookies.push(name);
			},
			set: () => {}
		};

		const url = new URL(`http://localhost${urlPath}`);

		const event = {
			url,
			cookies,
			locals: {}
		} as unknown as RequestEvent;

		return { event, deletedCookies };
	}

	it('redirects unauthenticated user accessing protected route to /login', async () => {
		const { db } = initializeDatabase(':memory:');
		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/');

		let resolveCalled = false;
		const resolve = async () => {
			resolveCalled = true;
			return new Response('OK');
		};

		await expect(handle({ event, resolve })).rejects.toMatchObject({
			status: 303,
			location: '/login'
		});
		expect(resolveCalled).toBe(false);
	});

	it('allows unauthenticated user to access /login', async () => {
		const { db } = initializeDatabase(':memory:');
		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/login');

		let resolveCalled = false;
		const resolve = async () => {
			resolveCalled = true;
			return new Response('LOGIN_PAGE');
		};

		const response = await handle({ event, resolve });
		expect(resolveCalled).toBe(true);
		expect(await response.text()).toBe('LOGIN_PAGE');
		expect(event.locals.user).toBeNull();
		expect(event.locals.session).toBeNull();
	});

	it('authenticates valid session and attaches user and session to locals', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
		const session = await createSession(db, admin.id);

		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/', session.id);

		let resolveCalled = false;
		const resolve = async () => {
			resolveCalled = true;
			return new Response('PROTECTED_PAGE');
		};

		const response = await handle({ event, resolve });
		expect(resolveCalled).toBe(true);
		expect(await response.text()).toBe('PROTECTED_PAGE');
		expect(event.locals.user).toBeDefined();
		expect(event.locals.user?.username).toBe('admin');
		expect(event.locals.session?.id).toBe(session.id);
	});

	it('redirects authenticated user accessing /login to /', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
		const session = await createSession(db, admin.id);

		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/login', session.id);

		const resolve = async () => new Response('LOGIN_PAGE');

		await expect(handle({ event, resolve })).rejects.toMatchObject({
			status: 303,
			location: '/'
		});
	});

	it('deletes invalid or expired session cookie and redirects to /login', async () => {
		const { db } = initializeDatabase(':memory:');
		const handle = createAuthHandle(db);
		const { event, deletedCookies } = createMockEvent('/', 'invalid-token-123');

		const resolve = async () => new Response('OK');

		await expect(handle({ event, resolve })).rejects.toMatchObject({
			status: 303,
			location: '/login'
		});
		expect(deletedCookies).toContain(SESSION_COOKIE_NAME);
		expect(event.locals.user).toBeNull();
		expect(event.locals.session).toBeNull();
	});
});
