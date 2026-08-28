import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { initializeDatabase } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createSession, SESSION_COOKIE_NAME } from '$lib/server/auth/session';
import {
	createVerifyEmailLoad,
	createVerifyEmailActions
} from './verify-email-actions';

describe('verify-email server load and actions', () => {
	function setupUser(
		db: any,
		options: { id?: string; username?: string; email?: string; emailConfirmed?: boolean } = {}
	) {
		const id = options.id ?? 'user-verify-1';
		const username = options.username ?? 'unconfirmed_typist';
		const email = options.email ?? 'typist@example.com';
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

	function createMockEvent(options: {
		user?: any;
		session?: any;
		formData?: Record<string, string>;
		origin?: string;
	}) {
		const formData = new FormData();
		if (options.formData) {
			for (const [k, v] of Object.entries(options.formData)) {
				formData.append(k, v);
			}
		}

		const deletedCookies: string[] = [];
		const cookies = {
			get: (name: string) => (name === SESSION_COOKIE_NAME ? options.session?.id : undefined),
			set: () => {},
			delete: (name: string) => {
				deletedCookies.push(name);
			}
		};

		const url = new URL(`${options.origin ?? 'http://localhost:5173'}/app/verify-email`);
		const request = {
			formData: async () => formData
		} as unknown as Request;

		const event = {
			request,
			url,
			cookies,
			locals: {
				user: options.user ?? null,
				session: options.session ?? null
			}
		} as unknown as RequestEvent;

		return { event, deletedCookies };
	}

	it('load returns the recipient email address for authenticated user', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		const user = setupUser(db, { email: 'hello@example.com' });
		const load = createVerifyEmailLoad(db);

		const { event } = createMockEvent({
			user: { ...user, role: 'user', name: 'Typist', createdAt: new Date() }
		});

		const result = await load(event);
		expect(result).toEqual({
			email: 'hello@example.com'
		});

		sqlite.close();
	});

	it('resend action invalidates previous tokens, creates new 1-hour token, and sends confirmation email', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		const user = setupUser(db, { email: 'resend@example.com', username: 'resender' });
		const session = await createSession(db, user.id);

		const sendEmailMock = vi.fn().mockResolvedValue({ delivered: true, mode: 'smtp' });
		const actions = createVerifyEmailActions(db, { sendEmail: sendEmailMock });

		const { event } = createMockEvent({
			user: { ...user, role: 'user', name: 'Resender', createdAt: new Date() },
			session
		});

		// Trigger resend
		const result = await actions.resend(event);
		expect(result).toEqual(
			expect.objectContaining({
				success: true,
				message: expect.stringContaining('resend@example.com')
			})
		);

		// Check token in DB
		const tokens1 = db.select().from(schema.emailConfirmationTokens).where(eq(schema.emailConfirmationTokens.userId, user.id)).all();
		expect(tokens1.length).toBe(1);
		const firstTokenId = tokens1[0].id;
		expect(sendEmailMock).toHaveBeenCalledTimes(1);
		expect(sendEmailMock).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'resend@example.com',
				username: 'resender',
				confirmUrl: expect.stringContaining('/app/confirm-email?token=')
			})
		);

		// Resend again - invalidates previous token and creates fresh one
		const result2 = await actions.resend(event);
		expect(result2).toEqual(
			expect.objectContaining({
				success: true
			})
		);

		const tokens2 = db.select().from(schema.emailConfirmationTokens).where(eq(schema.emailConfirmationTokens.userId, user.id)).all();
		expect(tokens2.length).toBe(1);
		expect(tokens2[0].id).not.toBe(firstTokenId);
		expect(sendEmailMock).toHaveBeenCalledTimes(2);

		sqlite.close();
	});

	it('logout action terminates session, clears session cookie, and redirects to /app/login', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		const user = setupUser(db);
		const session = await createSession(db, user.id);
		const actions = createVerifyEmailActions(db);

		const { event, deletedCookies } = createMockEvent({
			user: { ...user, role: 'user', name: 'User', createdAt: new Date() },
			session
		});

		await expect(actions.logout(event)).rejects.toMatchObject({
			status: 303,
			location: '/app/login'
		});

		expect(deletedCookies).toContain(SESSION_COOKIE_NAME);
		const sessionInDb = db.select().from(schema.sessions).where(eq(schema.sessions.id, session.id)).get();
		expect(sessionInDb).toBeUndefined();

		sqlite.close();
	});
});
