import { describe, expect, it, vi } from 'vitest';
import { initializeDatabase } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { createForgotPasswordAction } from './forgot-password-actions';
import type { RequestEvent } from '@sveltejs/kit';

describe('Forgot Password Server Actions', () => {
	function setupTestUser(
		db: any,
		id = 'user-reset-1',
		username = 'alice',
		email = 'alice@example.com'
	) {
		db.insert(schema.users)
			.values({
				id,
				username,
				email,
				passwordHash: 'hash123',
				createdAt: new Date()
			})
			.run();
	}

	function createMockEvent(formDataEntries: Record<string, string>, origin = 'http://localhost:5173') {
		const formData = new FormData();
		for (const [key, val] of Object.entries(formDataEntries)) {
			formData.append(key, val);
		}

		const url = new URL(`${origin}/app/forgot-password`);
		const request = {
			formData: async () => formData
		} as unknown as Request;

		const event = {
			request,
			url,
			cookies: {
				get: () => undefined,
				set: () => {},
				delete: () => {}
			},
			locals: { session: null, user: null }
		} as unknown as RequestEvent;

		return { event };
	}

	it('fails with 400 when username/email identifier is empty', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		const action = createForgotPasswordAction(db);
		const { event } = createMockEvent({ identifier: '' });

		const result: any = await action(event);
		expect(result.status).toBe(400);
		expect(result.data.message).toMatch(/username or email is required/i);

		sqlite.close();
	});

	it('initiates password reset when submitting an existing username', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		setupTestUser(db, 'u-alice', 'alice', 'alice@example.com');

		const sendEmailMock = vi.fn().mockResolvedValue({ delivered: true, mode: 'smtp' });
		const action = createForgotPasswordAction(db, { sendEmail: sendEmailMock });

		const { event } = createMockEvent({ identifier: 'alice' });
		const result: any = await action(event);

		expect(result).toEqual({
			success: true,
			message: expect.stringMatching(/if an account matches/i)
		});

		// Verify token was generated in database
		const tokens = db.select().from(schema.passwordResetTokens).all();
		expect(tokens.length).toBe(1);
		expect(tokens[0].userId).toBe('u-alice');

		// Verify email was dispatched with correct details
		expect(sendEmailMock).toHaveBeenCalledTimes(1);
		expect(sendEmailMock).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'alice@example.com',
				username: 'alice',
				resetUrl: expect.stringMatching(/^http:\/\/localhost:5173\/app\/reset-password\?token=[a-f0-9]+$/)
			})
		);

		sqlite.close();
	});

	it('initiates password reset when submitting an existing email', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		setupTestUser(db, 'u-bob', 'bob', 'bob@example.com');

		const sendEmailMock = vi.fn().mockResolvedValue({ delivered: true, mode: 'smtp' });
		const action = createForgotPasswordAction(db, { sendEmail: sendEmailMock });

		const { event } = createMockEvent({ identifier: 'bob@example.com' });
		const result: any = await action(event);

		expect(result).toEqual({
			success: true,
			message: expect.stringMatching(/if an account matches/i)
		});

		const tokens = db.select().from(schema.passwordResetTokens).all();
		expect(tokens.length).toBe(1);
		expect(tokens[0].userId).toBe('u-bob');

		expect(sendEmailMock).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'bob@example.com',
				username: 'bob',
				resetUrl: expect.stringMatching(/^http:\/\/localhost:5173\/app\/reset-password\?token=[a-f0-9]+$/)
			})
		);

		sqlite.close();
	});

	it('returns identical generic confirmation message without creating tokens or sending email for nonexistent user', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		setupTestUser(db, 'u-alice', 'alice', 'alice@example.com');

		const sendEmailMock = vi.fn().mockResolvedValue({ delivered: true, mode: 'smtp' });
		const action = createForgotPasswordAction(db, { sendEmail: sendEmailMock });

		const { event } = createMockEvent({ identifier: 'nonexistent@example.com' });
		const result: any = await action(event);

		// Confirmation message must match exactly to prevent account enumeration
		expect(result).toEqual({
			success: true,
			message: expect.stringMatching(/if an account matches/i)
		});

		// No tokens created
		const tokens = db.select().from(schema.passwordResetTokens).all();
		expect(tokens.length).toBe(0);

		// No email sent
		expect(sendEmailMock).not.toHaveBeenCalled();

		sqlite.close();
	});

	it('invalidates prior reset tokens when user requests password reset again', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		setupTestUser(db, 'u-alice', 'alice', 'alice@example.com');

		const sendEmailMock = vi.fn().mockResolvedValue({ delivered: true, mode: 'smtp' });
		const action = createForgotPasswordAction(db, { sendEmail: sendEmailMock });

		// First request
		const { event: event1 } = createMockEvent({ identifier: 'alice' });
		await action(event1);

		const tokensAfterFirst = db.select().from(schema.passwordResetTokens).all();
		expect(tokensAfterFirst.length).toBe(1);
		const firstTokenId = tokensAfterFirst[0].id;

		// Second request
		const { event: event2 } = createMockEvent({ identifier: 'alice@example.com' });
		await action(event2);

		const tokensAfterSecond = db.select().from(schema.passwordResetTokens).all();
		expect(tokensAfterSecond.length).toBe(1);
		expect(tokensAfterSecond[0].id).not.toBe(firstTokenId);

		sqlite.close();
	});

	it('handles user without an email address by logging reset URL to console and returning confirmation', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		// User with null email
		db.insert(schema.users)
			.values({
				id: 'u-noemail',
				username: 'noemailuser',
				email: null,
				passwordHash: 'hash123',
				createdAt: new Date()
			})
			.run();

		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const sendEmailMock = vi.fn();
		const action = createForgotPasswordAction(db, { sendEmail: sendEmailMock });

		const { event } = createMockEvent({ identifier: 'noemailuser' });
		const result: any = await action(event);

		expect(result).toEqual({
			success: true,
			message: expect.stringMatching(/if an account matches/i)
		});

		// Reset token is still created
		const tokens = db.select().from(schema.passwordResetTokens).all();
		expect(tokens.length).toBe(1);

		// sendEmailMock is not called because there's no email address
		expect(sendEmailMock).not.toHaveBeenCalled();

		// Console should have logged the reset URL
		expect(consoleSpy).toHaveBeenCalled();
		const logged = consoleSpy.mock.calls.flat().join(' ');
		expect(logged).toContain('http://localhost:5173/app/reset-password?token=');

		sqlite.close();
	});
});
