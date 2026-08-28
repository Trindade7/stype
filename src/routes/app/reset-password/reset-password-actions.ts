import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/server/db/schema';
import {
	validateResetToken,
	invalidateUserResetTokens
} from '$lib/server/auth/reset-token';
import { hashPassword } from '$lib/server/auth/password';
import {
	createSession,
	invalidateUserSessions,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE_SECONDS
} from '$lib/server/auth/session';

export interface ResetPasswordLoadResult {
	valid: boolean;
	token: string;
	error?: string;
}

export function createResetPasswordLoad(db: BetterSQLite3Database<typeof schema>) {
	return async ({ url }: RequestEvent): Promise<ResetPasswordLoadResult> => {
		const token = url.searchParams.get('token')?.trim() ?? '';

		if (!token) {
			return {
				valid: false,
				token: '',
				error: 'No reset token provided. Please request a new password reset link.'
			};
		}

		const { tokenRecord, user } = await validateResetToken(db, token);
		if (!tokenRecord || !user) {
			return {
				valid: false,
				token: '',
				error: 'This password reset link is invalid or has expired. Please request a new reset link.'
			};
		}

		return {
			valid: true,
			token
		};
	};
}

export function createResetPasswordAction(db: BetterSQLite3Database<typeof schema>) {
	return async ({ request, cookies }: RequestEvent) => {
		const data = await request.formData();
		const token = data.get('token')?.toString().trim() ?? '';
		const password = data.get('password')?.toString() ?? '';
		const confirmPassword = data.get('confirmPassword')?.toString() ?? '';

		if (!token) {
			return fail(400, {
				message: 'Reset token is required',
				invalidToken: true
			});
		}

		if (!password || !confirmPassword) {
			return fail(400, {
				message: 'Password and confirmation are required',
				invalidToken: false
			});
		}

		if (password.length < 8) {
			return fail(400, {
				message: 'Password must be at least 8 characters',
				invalidToken: false
			});
		}

		if (password !== confirmPassword) {
			return fail(400, {
				message: 'Passwords do not match',
				invalidToken: false
			});
		}

		const { tokenRecord, user } = await validateResetToken(db, token);
		if (!tokenRecord || !user) {
			return fail(400, {
				message: 'This password reset link is invalid or has expired. Please request a new reset link.',
				invalidToken: true
			});
		}

		const passwordHash = await hashPassword(password);

		// Update user password hash
		db.update(schema.users)
			.set({ passwordHash })
			.where(eq(schema.users.id, user.id))
			.run();

		// Invalidate all reset tokens for this user so none can be reused
		await invalidateUserResetTokens(db, user.id);

		// Invalidate all existing sessions for this user across all devices
		await invalidateUserSessions(db, user.id);

		// Create a new authenticated session
		const session = await createSession(db, user.id);

		cookies.set(SESSION_COOKIE_NAME, session.id, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: SESSION_MAX_AGE_SECONDS,
			secure: process.env.NODE_ENV === 'production'
		});

		redirect(303, '/app');
	};
}
