import { describe, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { initializeDatabase } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createSession, SESSION_COOKIE_NAME } from '$lib/server/auth/session';
import { createEmailConfirmationToken } from '$lib/server/auth/confirmation-token';
import { createConfirmEmailLoad } from './confirm-email-actions';

describe('confirm-email server load', () => {
	function setupUser(
		db: any,
		options: { id?: string; username?: string; email?: string; emailConfirmed?: boolean } = {}
	) {
		const id = options.id ?? 'user-confirm-1';
		const username = options.username ?? 'confirming_typist';
		const email = options.email ?? 'confirm@example.com';
		const emailConfirmed = options.emailConfirmed ?? false;

		db.insert(schema.users)
			.values({
				id,
				username,
				email,
				role: 'user',
				emailConfirmed,
				passwordHash: 'hash123',
				createdAt: new Date()
			})
			.run();

		return { id, username, email, emailConfirmed };
	}

	function createMockEvent(token?: string, cookieValue?: string) {
		let setCookieCall: { name: string; value: string; options?: any } | null = null;

		const cookies = {
			get: (name: string) => (name === SESSION_COOKIE_NAME ? cookieValue : undefined),
			set: (name: string, value: string, options?: any) => {
				setCookieCall = { name, value, options };
			},
			delete: () => {}
		};

		const url = new URL(`http://localhost:5173/app/confirm-email${token !== undefined ? `?token=${token}` : ''}`);
		const request = {} as Request;

		const event = {
			request,
			url,
			cookies,
			locals: { user: null, session: null }
		} as unknown as RequestEvent;

		return {
			event,
			getSetCookie: () => setCookieCall
		};
	}

	it('returns invalid state when token query param is missing or empty', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		const load = createConfirmEmailLoad(db);

		const { event: missingEvent } = createMockEvent();
		const resultMissing = await load(missingEvent);
		expect(resultMissing).toEqual(
			expect.objectContaining({
				valid: false,
				error: expect.stringMatching(/no confirmation token provided/i)
			})
		);

		const { event: emptyEvent } = createMockEvent('   ');
		const resultEmpty = await load(emptyEvent);
		expect(resultEmpty).toEqual(
			expect.objectContaining({
				valid: false,
				error: expect.stringMatching(/no confirmation token provided/i)
			})
		);

		sqlite.close();
	});

	it('returns invalid state when token does not exist in database', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		const load = createConfirmEmailLoad(db);

		const { event } = createMockEvent('non-existent-token-12345');
		const result = await load(event);
		expect(result).toEqual(
			expect.objectContaining({
				valid: false,
				error: expect.stringMatching(/invalid or has expired/i)
			})
		);

		sqlite.close();
	});

	it('returns invalid state and purges token when token has expired', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		const user = setupUser(db);
		const { token, id } = await createEmailConfirmationToken(db, user.id);

		// Expire token in database
		db.update(schema.emailConfirmationTokens)
			.set({ expiresAt: new Date(Date.now() - 10000) })
			.where(eq(schema.emailConfirmationTokens.id, id))
			.run();

		const load = createConfirmEmailLoad(db);
		const { event } = createMockEvent(token);

		const result = await load(event);
		expect(result).toEqual(
			expect.objectContaining({
				valid: false,
				error: expect.stringMatching(/invalid or has expired/i)
			})
		);

		// Verify expired token was cleaned up
		const tokensInDb = db.select().from(schema.emailConfirmationTokens).all();
		expect(tokensInDb.length).toBe(0);

		// Verify user remains unconfirmed
		const userInDb = db.select().from(schema.users).where(eq(schema.users.id, user.id)).get();
		expect(userInDb?.emailConfirmed).toBe(false);

		sqlite.close();
	});

	it('confirms user, deletes token, creates session, and redirects to /app when token is valid', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		const user = setupUser(db);
		const { token } = await createEmailConfirmationToken(db, user.id);

		const load = createConfirmEmailLoad(db);
		const { event, getSetCookie } = createMockEvent(token);

		await expect(load(event)).rejects.toMatchObject({
			status: 303,
			location: '/app'
		});

		// Verify user is now confirmed
		const userInDb = db.select().from(schema.users).where(eq(schema.users.id, user.id)).get();
		expect(userInDb?.emailConfirmed).toBe(true);

		// Verify token was invalidated/deleted
		const tokensInDb = db.select().from(schema.emailConfirmationTokens).all();
		expect(tokensInDb.length).toBe(0);

		// Verify session cookie was set
		const cookie = getSetCookie();
		expect(cookie).toBeDefined();
		expect(cookie?.name).toBe(SESSION_COOKIE_NAME);
		expect(cookie?.value).toBeTruthy();

		// Verify session in database matches user
		const sessionInDb = db.select().from(schema.sessions).where(eq(schema.sessions.id, cookie!.value)).get();
		expect(sessionInDb).toBeDefined();
		expect(sessionInDb?.userId).toBe(user.id);

		sqlite.close();
	});
});
