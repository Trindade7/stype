import { describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { initializeDatabase } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { createPasswordResetToken, hashResetToken } from '$lib/server/auth/reset-token';
import { createSession, SESSION_COOKIE_NAME } from '$lib/server/auth/session';
import { hashPassword, verifyPassword } from '$lib/server/auth/password';
import { createLoginAction } from '../login/auth-actions';
import {
	createResetPasswordLoad,
	createResetPasswordAction
} from './reset-password-actions';
import type { RequestEvent } from '@sveltejs/kit';

describe('Reset Password Server Actions and Load', () => {
	async function setupTestUser(
		db: any,
		id = 'u-tester',
		username = 'tester',
		password = 'oldPassword123'
	) {
		const passwordHash = await hashPassword(password);
		db.insert(schema.users)
			.values({
				id,
				username,
				email: `${username}@example.com`,
				passwordHash,
				createdAt: new Date()
			})
			.run();
		return { id, username, originalPassword: password };
	}

	function createMockLoadEvent(search = '') {
		const url = new URL(`http://localhost:5173/app/reset-password${search}`);
		return {
			url,
			locals: { user: null, session: null }
		} as unknown as RequestEvent;
	}

	function createMockActionEvent(formDataEntries: Record<string, string>) {
		const formData = new FormData();
		for (const [key, val] of Object.entries(formDataEntries)) {
			formData.append(key, val);
		}

		const setCookies: Record<string, { value: string; opts: any }> = {};

		const url = new URL('http://localhost:5173/app/reset-password');
		const request = {
			formData: async () => formData
		} as unknown as Request;

		const cookies = {
			get: (name: string) => setCookies[name]?.value,
			set: (name: string, value: string, opts: any) => {
				setCookies[name] = { value, opts };
			},
			delete: (name: string) => {
				delete setCookies[name];
			}
		};

		const event = {
			request,
			url,
			cookies,
			locals: { session: null, user: null }
		} as unknown as RequestEvent;

		return { event, setCookies };
	}

	describe('createResetPasswordLoad', () => {
		it('returns invalid state when token query parameter is missing', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const load = createResetPasswordLoad(db);
			const event = createMockLoadEvent();

			const result: any = await load(event);
			expect(result.valid).toBe(false);
			expect(result.error).toMatch(/no reset token provided/i);
			expect(result.token).toBe('');

			sqlite.close();
		});

		it('returns invalid state when token is invalid or non-existent', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const load = createResetPasswordLoad(db);
			const event = createMockLoadEvent('?token=invalid-token-12345');

			const result: any = await load(event);
			expect(result.valid).toBe(false);
			expect(result.error).toMatch(/invalid or has expired/i);
			expect(result.token).toBe('');

			sqlite.close();
		});

		it('returns invalid state when token has expired', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const user = await setupTestUser(db);
			const { token } = await createPasswordResetToken(db, user.id);

			// Expire the token manually
			const tokenHash = hashResetToken(token);
			db.update(schema.passwordResetTokens)
				.set({ expiresAt: new Date(Date.now() - 60000) })
				.where(eq(schema.passwordResetTokens.tokenHash, tokenHash))
				.run();

			const load = createResetPasswordLoad(db);
			const event = createMockLoadEvent(`?token=${token}`);

			const result: any = await load(event);
			expect(result.valid).toBe(false);
			expect(result.error).toMatch(/invalid or has expired/i);

			sqlite.close();
		});

		it('returns valid state when token is valid and active', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const user = await setupTestUser(db);
			const { token } = await createPasswordResetToken(db, user.id);

			const load = createResetPasswordLoad(db);
			const event = createMockLoadEvent(`?token=${token}`);

			const result: any = await load(event);
			expect(result.valid).toBe(true);
			expect(result.token).toBe(token);
			expect(result.error).toBeUndefined();

			sqlite.close();
		});
	});

	describe('createResetPasswordAction', () => {
		it('fails with 400 when token is missing', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createResetPasswordAction(db);
			const { event } = createMockActionEvent({
				password: 'newPassword123',
				confirmPassword: 'newPassword123'
			});

			const result: any = await action(event);
			expect(result.status).toBe(400);
			expect(result.data.message).toMatch(/token is required/i);

			sqlite.close();
		});

		it('fails with 400 when password or confirmation is missing', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createResetPasswordAction(db);
			const { event } = createMockActionEvent({
				token: 'some-token',
				password: '',
				confirmPassword: ''
			});

			const result: any = await action(event);
			expect(result.status).toBe(400);
			expect(result.data.message).toMatch(/password and confirmation are required/i);

			sqlite.close();
		});

		it('fails with 400 when password is fewer than 8 characters', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createResetPasswordAction(db);
			const { event } = createMockActionEvent({
				token: 'some-token',
				password: 'short',
				confirmPassword: 'short'
			});

			const result: any = await action(event);
			expect(result.status).toBe(400);
			expect(result.data.message).toMatch(/at least 8 characters/i);

			sqlite.close();
		});

		it('fails with 400 when password and confirmation do not match', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createResetPasswordAction(db);
			const { event } = createMockActionEvent({
				token: 'some-token',
				password: 'password123',
				confirmPassword: 'different123'
			});

			const result: any = await action(event);
			expect(result.status).toBe(400);
			expect(result.data.message).toMatch(/passwords do not match/i);

			sqlite.close();
		});

		it('fails with 400 when token is invalid or expired', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createResetPasswordAction(db);
			const { event } = createMockActionEvent({
				token: 'nonexistent-token',
				password: 'newValidPassword123',
				confirmPassword: 'newValidPassword123'
			});

			const result: any = await action(event);
			expect(result.status).toBe(400);
			expect(result.data.message).toMatch(/invalid or has expired/i);

			sqlite.close();
		});

		it('resets password, destroys existing sessions, creates session, and redirects on valid submission', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const user = await setupTestUser(db);
			const { token } = await createPasswordResetToken(db, user.id);

			// User has 2 active sessions before resetting
			const session1 = await createSession(db, user.id);
			const session2 = await createSession(db, user.id);

			// Another user has an active session
			const otherUser = await setupTestUser(db, 'u-other', 'other');
			const otherSession = await createSession(db, otherUser.id);

			const action = createResetPasswordAction(db);
			const { event, setCookies } = createMockActionEvent({
				token,
				password: 'brandNewPassword456',
				confirmPassword: 'brandNewPassword456'
			});

			let redirected: any = null;
			try {
				await action(event);
			} catch (err: any) {
				redirected = err;
			}

			// Must redirect 303 to /app
			expect(redirected).toBeDefined();
			expect(redirected.status).toBe(303);
			expect(redirected.location).toBe('/app');

			// Password hash should be updated
			const updatedUser = db.select().from(schema.users).where(eq(schema.users.id, user.id)).get()!;
			const matchesNew = await verifyPassword('brandNewPassword456', updatedUser.passwordHash);
			expect(matchesNew).toBe(true);

			// Token must be invalidated/deleted so it cannot be reused
			const remainingTokens = db
				.select()
				.from(schema.passwordResetTokens)
				.where(eq(schema.passwordResetTokens.userId, user.id))
				.all();
			expect(remainingTokens.length).toBe(0);

			// Pre-existing sessions for this user must be terminated
			const oldSessionCheck1 = db.select().from(schema.sessions).where(eq(schema.sessions.id, session1.id)).get();
			const oldSessionCheck2 = db.select().from(schema.sessions).where(eq(schema.sessions.id, session2.id)).get();
			expect(oldSessionCheck1).toBeUndefined();
			expect(oldSessionCheck2).toBeUndefined();

			// Other user's session remains untouched
			const otherSessionCheck = db.select().from(schema.sessions).where(eq(schema.sessions.id, otherSession.id)).get();
			expect(otherSessionCheck).toBeDefined();

			// New authenticated session cookie was set
			const sessionCookie = setCookies[SESSION_COOKIE_NAME];
			expect(sessionCookie).toBeDefined();
			expect(sessionCookie.value).toBeDefined();
			expect(sessionCookie.opts.path).toBe('/');
			expect(sessionCookie.opts.httpOnly).toBe(true);

			// The session in cookie actually exists in db for this user
			const newSessionInDb = db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionCookie.value)).get();
			expect(newSessionInDb).toBeDefined();
			expect(newSessionInDb?.userId).toBe(user.id);

			// Attempting to reuse the same token now fails
			const { event: reuseEvent } = createMockActionEvent({
				token,
				password: 'anotherPassword789',
				confirmPassword: 'anotherPassword789'
			});
			const reuseResult: any = await action(reuseEvent);
			expect(reuseResult.status).toBe(400);
			expect(reuseResult.data.message).toMatch(/invalid or has expired/i);

			sqlite.close();
		});

		it('verifies that subsequent login succeeds with new password and fails with old password', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const user = await setupTestUser(db, 'u-auth-test', 'authtester', 'originalSecret1');
			const { token } = await createPasswordResetToken(db, user.id);

			// Reset password to 'newSecretPassword2'
			const resetAction = createResetPasswordAction(db);
			const { event: resetEvent } = createMockActionEvent({
				token,
				password: 'newSecretPassword2',
				confirmPassword: 'newSecretPassword2'
			});

			try {
				await resetAction(resetEvent);
			} catch (err: any) {
				expect(err.status).toBe(303);
			}

			// Now attempt login using the login action
			const loginAction = createLoginAction(db);

			// 1. Attempt login with OLD password -> should fail
			const { event: oldLoginEvent } = createMockActionEvent({
				username: 'authtester',
				password: 'originalSecret1'
			});
			const failResult: any = await loginAction(oldLoginEvent);
			expect(failResult.status).toBe(400);
			expect(failResult.data.message).toMatch(/invalid username\/email or password/i);

			// 2. Attempt login with NEW password -> should succeed (303 redirect)
			const { event: newLoginEvent, setCookies: newLoginCookies } = createMockActionEvent({
				username: 'authtester',
				password: 'newSecretPassword2'
			});

			let loginRedirect: any = null;
			try {
				await loginAction(newLoginEvent);
			} catch (err: any) {
				loginRedirect = err;
			}
			expect(loginRedirect).toBeDefined();
			expect(loginRedirect.status).toBe(303);
			expect(loginRedirect.location).toBe('/app');
			expect(newLoginCookies[SESSION_COOKIE_NAME]).toBeDefined();

			sqlite.close();
		});
	});
});
