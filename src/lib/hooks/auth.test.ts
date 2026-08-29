import { describe, expect, it } from 'vitest';
import type { Handle, RequestEvent } from '@sveltejs/kit';
import { initializeDatabase } from '../server/db';
import { seedAdminUser } from '../server/db/seed';
import * as schema from '../server/db/schema';
import { eq } from 'drizzle-orm';
import { createSession, SESSION_COOKIE_NAME } from '../server/auth/session';
import { createAuthHandle } from './auth';

describe('auth server hook', () => {
	function createMockEvent(
		urlPath: string,
		cookieValue?: string,
		headers?: Record<string, string>
	): {
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
		const reqHeaders = new Headers(headers);
		const request = new Request(url.toString(), { headers: reqHeaders });

		const event = {
			url,
			request,
			cookies,
			locals: {}
		} as unknown as RequestEvent;

		return { event, deletedCookies };
	}

	it('redirects unauthenticated user accessing protected route to /app/login', async () => {
		const { db } = initializeDatabase(':memory:');
		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/app/dashboard');

		let resolveCalled = false;
		const resolve = async () => {
			resolveCalled = true;
			return new Response('OK');
		};

		await expect(handle({ event, resolve })).rejects.toMatchObject({
			status: 303,
			location: '/app/login'
		});
		expect(resolveCalled).toBe(false);
	});

	it('allows unauthenticated user to access guest routes', async () => {
		const { db } = initializeDatabase(':memory:');
		const handle = createAuthHandle(db);

		for (const path of ['/', '/history', '/settings']) {
			const { event } = createMockEvent(path);
			let resolveCalled = false;
			const resolve = async () => {
				resolveCalled = true;
				return new Response('GUEST_PAGE');
			};

			const response = await handle({ event, resolve });
			expect(resolveCalled).toBe(true);
			expect(await response.text()).toBe('GUEST_PAGE');
			expect(event.locals.user).toBeNull();
			expect(event.locals.session).toBeNull();
		}
	});

	it('allows unauthenticated user to access /app/login', async () => {
		const { db } = initializeDatabase(':memory:');
		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/app/login');

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

	it('allows unauthenticated user to access /app/signup', async () => {
		const { db } = initializeDatabase(':memory:');
		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/app/signup');

		let resolveCalled = false;
		const resolve = async () => {
			resolveCalled = true;
			return new Response('SIGNUP_PAGE');
		};

		const response = await handle({ event, resolve });
		expect(resolveCalled).toBe(true);
		expect(await response.text()).toBe('SIGNUP_PAGE');
		expect(event.locals.user).toBeNull();
		expect(event.locals.session).toBeNull();
	});

	it('allows unauthenticated user to access /app/forgot-password', async () => {
		const { db } = initializeDatabase(':memory:');
		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/app/forgot-password');

		let resolveCalled = false;
		const resolve = async () => {
			resolveCalled = true;
			return new Response('FORGOT_PASSWORD_PAGE');
		};

		const response = await handle({ event, resolve });
		expect(resolveCalled).toBe(true);
		expect(await response.text()).toBe('FORGOT_PASSWORD_PAGE');
		expect(event.locals.user).toBeNull();
		expect(event.locals.session).toBeNull();
	});

	it('allows unauthenticated user to access /app/reset-password', async () => {
		const { db } = initializeDatabase(':memory:');
		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/app/reset-password?token=some-token');

		let resolveCalled = false;
		const resolve = async () => {
			resolveCalled = true;
			return new Response('RESET_PASSWORD_PAGE');
		};

		const response = await handle({ event, resolve });
		expect(resolveCalled).toBe(true);
		expect(await response.text()).toBe('RESET_PASSWORD_PAGE');
		expect(event.locals.user).toBeNull();
		expect(event.locals.session).toBeNull();
	});

	it('authenticates valid session and attaches user and session to locals', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
		const session = await createSession(db, admin.id);

		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/app', session.id);

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
		expect(event.locals.user?.role).toBe('admin');
		expect(event.locals.session?.id).toBe(session.id);
	});

	it('redirects authenticated user accessing /app/login to /app', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
		const session = await createSession(db, admin.id);

		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/app/login', session.id);

		const resolve = async () => new Response('LOGIN_PAGE');

		await expect(handle({ event, resolve })).rejects.toMatchObject({
			status: 303,
			location: '/app'
		});
	});

	it('redirects authenticated user accessing /app/signup to /app', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
		const session = await createSession(db, admin.id);

		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/app/signup', session.id);

		const resolve = async () => new Response('SIGNUP_PAGE');

		await expect(handle({ event, resolve })).rejects.toMatchObject({
			status: 303,
			location: '/app'
		});
	});

	it('redirects authenticated user accessing /app/forgot-password to /app', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
		const session = await createSession(db, admin.id);

		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/app/forgot-password', session.id);

		const resolve = async () => new Response('FORGOT_PASSWORD_PAGE');

		await expect(handle({ event, resolve })).rejects.toMatchObject({
			status: 303,
			location: '/app'
		});
	});

	it('redirects authenticated user accessing /app/reset-password to /app', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
		const session = await createSession(db, admin.id);

		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/app/reset-password?token=test', session.id);

		const resolve = async () => new Response('RESET_PASSWORD_PAGE');

		await expect(handle({ event, resolve })).rejects.toMatchObject({
			status: 303,
			location: '/app'
		});
	});

	it('redirects authenticated user accessing guest routes to /app', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
		const session = await createSession(db, admin.id);

		const handle = createAuthHandle(db);

		for (const path of ['/', '/history', '/settings']) {
			const { event } = createMockEvent(path, session.id);
			const resolve = async () => new Response('GUEST_PAGE');

			await expect(handle({ event, resolve })).rejects.toMatchObject({
				status: 303,
				location: '/app'
			});
		}
	});

	it('authenticates valid session via Authorization Bearer header on api routes', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
		const session = await createSession(db, admin.id);

		const handle = createAuthHandle(db);
		const { event } = createMockEvent('/api/sync', undefined, {
			Authorization: `Bearer ${session.id}`
		});

		let resolveCalled = false;
		const resolve = async () => {
			resolveCalled = true;
			return new Response(JSON.stringify({ ok: true }), {
				headers: { 'Content-Type': 'application/json' }
			});
		};

		const response = await handle({ event, resolve });
		expect(resolveCalled).toBe(true);
		expect(event.locals.user).toBeDefined();
		expect(event.locals.user?.username).toBe('admin');
		expect(event.locals.session?.id).toBe(session.id);
	});

	it('allows authenticated user to access api routes without redirecting', async () => {
		const { db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
		const session = await createSession(db, admin.id);

		const handle = createAuthHandle(db);

		for (const path of ['/api/test-runs', '/api/settings', '/app/api/sync']) {
			const { event } = createMockEvent(path, session.id);
			let resolveCalled = false;
			const resolve = async () => {
				resolveCalled = true;
				return new Response(JSON.stringify({ ok: true }), {
					headers: { 'Content-Type': 'application/json' }
				});
			};

			const response = await handle({ event, resolve });
			expect(resolveCalled).toBe(true);
			const json = await response.json();
			expect(json).toEqual({ ok: true });
			expect(event.locals.user).toBeDefined();
			expect(event.locals.user?.username).toBe('admin');
		}
	});

	it('allows unauthenticated user to access api routes without redirecting', async () => {
		const { db } = initializeDatabase(':memory:');
		const handle = createAuthHandle(db);

		for (const path of ['/api/test-runs', '/api/settings', '/app/api/sync']) {
			const { event } = createMockEvent(path);
			let resolveCalled = false;
			const resolve = async () => {
				resolveCalled = true;
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				});
			};

			const response = await handle({ event, resolve });
			expect(resolveCalled).toBe(true);
			expect(response.status).toBe(401);
			expect(event.locals.user).toBeNull();
		}
	});

	it('deletes invalid or expired session cookie and redirects to /app/login', async () => {
		const { db } = initializeDatabase(':memory:');
		const handle = createAuthHandle(db);
		const { event, deletedCookies } = createMockEvent('/app/dashboard', 'invalid-token-123');

		const resolve = async () => new Response('OK');

		await expect(handle({ event, resolve })).rejects.toMatchObject({
			status: 303,
			location: '/app/login'
		});
		expect(deletedCookies).toContain(SESSION_COOKIE_NAME);
		expect(event.locals.user).toBeNull();
		expect(event.locals.session).toBeNull();
	});

	describe('admin route authorization', () => {
		it('redirects unauthenticated user accessing /app/admin routes to /app/login', async () => {
			const { db } = initializeDatabase(':memory:');
			const handle = createAuthHandle(db);

			for (const path of ['/app/admin', '/app/admin/users', '/app/admin/settings']) {
				const { event } = createMockEvent(path);
				const resolve = async () => new Response('ADMIN_PAGE');

				await expect(handle({ event, resolve })).rejects.toMatchObject({
					status: 303,
					location: '/app/login'
				});
			}
		});

		it('denies non-administrator authenticated user accessing /app/admin routes with 403 Forbidden', async () => {
			const { db } = initializeDatabase(':memory:');
			db.insert(schema.users)
				.values({
					id: 'regular-user-id',
					username: 'reguser',
					email: 'reg@example.com',
					role: 'user',
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const session = await createSession(db, 'regular-user-id');
			const handle = createAuthHandle(db);

			for (const path of ['/app/admin', '/app/admin/users', '/app/admin/audit']) {
				const { event } = createMockEvent(path, session.id);
				const resolve = async () => new Response('ADMIN_PAGE');

				await expect(handle({ event, resolve })).rejects.toMatchObject({
					status: 403
				});
			}
		});

		it('allows administrator access to /app/admin routes', async () => {
			const { db } = initializeDatabase(':memory:');
			await seedAdminUser(db);

			const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
			const session = await createSession(db, admin.id);

			const handle = createAuthHandle(db);

			for (const path of ['/app/admin', '/app/admin/users']) {
				const { event } = createMockEvent(path, session.id);
				let resolveCalled = false;
				const resolve = async () => {
					resolveCalled = true;
					return new Response('ADMIN_PAGE');
				};

				const response = await handle({ event, resolve });
				expect(resolveCalled).toBe(true);
				expect(await response.text()).toBe('ADMIN_PAGE');
				expect(event.locals.user?.role).toBe('admin');
			}
		});
	});

	describe('email verification routing guard', () => {
		it('redirects unauthenticated user accessing /app/verify-email to /app/login', async () => {
			const { db } = initializeDatabase(':memory:');
			const handle = createAuthHandle(db, { isSmtpConfigured: () => true });
			const { event } = createMockEvent('/app/verify-email');
			const resolve = async () => new Response('PAGE');

			await expect(handle({ event, resolve })).rejects.toMatchObject({
				status: 303,
				location: '/app/login'
			});
		});

		it('allows unauthenticated access to /app/confirm-email', async () => {
			const { db } = initializeDatabase(':memory:');
			const handle = createAuthHandle(db, { isSmtpConfigured: () => true });
			const { event } = createMockEvent('/app/confirm-email');
			let resolveCalled = false;
			const resolve = async () => {
				resolveCalled = true;
				return new Response('CONFIRM_PAGE');
			};

			const res = await handle({ event, resolve });
			expect(resolveCalled).toBe(true);
			expect(await res.text()).toBe('CONFIRM_PAGE');
		});

		it('redirects unconfirmed authenticated user on SMTP-enabled instance to /app/verify-email when accessing app routes', async () => {
			const { db } = initializeDatabase(':memory:');
			db.insert(schema.users)
				.values({
					id: 'unconfirmed-user-id',
					username: 'unconfirmed',
					email: 'unconfirmed@example.com',
					role: 'user',
					emailConfirmed: false,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const session = await createSession(db, 'unconfirmed-user-id');
			const handle = createAuthHandle(db, { isSmtpConfigured: () => true });

			for (const path of ['/app', '/app/history', '/app/stats', '/app/settings', '/app/admin']) {
				const { event } = createMockEvent(path, session.id);
				const resolve = async () => new Response('APP_PAGE');

				await expect(handle({ event, resolve })).rejects.toMatchObject({
					status: 303,
					location: '/app/verify-email'
				});
			}
		});

		it('allows unconfirmed authenticated user on SMTP-enabled instance to access /app/verify-email, /app/confirm-email, and /app/logout', async () => {
			const { db } = initializeDatabase(':memory:');
			db.insert(schema.users)
				.values({
					id: 'unconfirmed-user-id',
					username: 'unconfirmed',
					email: 'unconfirmed@example.com',
					role: 'user',
					emailConfirmed: false,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const session = await createSession(db, 'unconfirmed-user-id');
			const handle = createAuthHandle(db, { isSmtpConfigured: () => true });

			for (const path of ['/app/verify-email', '/app/confirm-email', '/app/logout']) {
				const { event } = createMockEvent(path, session.id);
				let resolveCalled = false;
				const resolve = async () => {
					resolveCalled = true;
					return new Response('OK');
				};

				const res = await handle({ event, resolve });
				expect(resolveCalled).toBe(true);
				expect(await res.text()).toBe('OK');
			}
		});

		it('redirects confirmed authenticated user accessing /app/verify-email to /app', async () => {
			const { db } = initializeDatabase(':memory:');
			db.insert(schema.users)
				.values({
					id: 'confirmed-user-id',
					username: 'confirmed',
					email: 'confirmed@example.com',
					role: 'user',
					emailConfirmed: true,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const session = await createSession(db, 'confirmed-user-id');
			const handle = createAuthHandle(db, { isSmtpConfigured: () => true });

			const { event } = createMockEvent('/app/verify-email', session.id);
			const resolve = async () => new Response('PAGE');

			await expect(handle({ event, resolve })).rejects.toMatchObject({
				status: 303,
				location: '/app'
			});
		});

		it('allows unconfirmed user to access /app when SMTP is unconfigured', async () => {
			const { db } = initializeDatabase(':memory:');
			db.insert(schema.users)
				.values({
					id: 'unconfirmed-user-id',
					username: 'unconfirmed',
					email: 'unconfirmed@example.com',
					role: 'user',
					emailConfirmed: false,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const session = await createSession(db, 'unconfirmed-user-id');
			const handle = createAuthHandle(db, { isSmtpConfigured: () => false });

			const { event } = createMockEvent('/app', session.id);
			let resolveCalled = false;
			const resolve = async () => {
				resolveCalled = true;
				return new Response('APP_PAGE');
			};

			const res = await handle({ event, resolve });
			expect(resolveCalled).toBe(true);
			expect(await res.text()).toBe('APP_PAGE');
		});
	});
});
