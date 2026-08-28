import { redirect, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/server/db/schema';
import {
	validateConfirmationToken,
	invalidateConfirmationToken
} from '$lib/server/auth/confirmation-token';
import {
	createSession,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE_SECONDS
} from '$lib/server/auth/session';

export interface ConfirmEmailLoadResult {
	valid: boolean;
	error?: string;
}

export function createConfirmEmailLoad(db: BetterSQLite3Database<typeof schema>) {
	return async ({ url, cookies, locals }: RequestEvent): Promise<ConfirmEmailLoadResult> => {
		const token = url.searchParams.get('token')?.trim() ?? '';

		if (!token) {
			return {
				valid: false,
				error: 'No confirmation token provided. Please check your email link or request a new confirmation email.'
			};
		}

		const { tokenRecord, user } = await validateConfirmationToken(db, token);
		if (!tokenRecord || !user) {
			return {
				valid: false,
				error: 'This email confirmation link is invalid or has expired. Please request a new confirmation email.'
			};
		}

		// Update user emailConfirmed in database
		db.update(schema.users)
			.set({ emailConfirmed: true })
			.where(eq(schema.users.id, user.id))
			.run();

		// Invalidate redeemed token
		await invalidateConfirmationToken(db, tokenRecord.id);

		// Ensure active session exists for this user
		if (!locals.session || locals.user?.id !== user.id) {
			const session = await createSession(db, user.id);
			cookies.set(SESSION_COOKIE_NAME, session.id, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				maxAge: SESSION_MAX_AGE_SECONDS,
				secure: process.env.NODE_ENV === 'production'
			});
		}

		redirect(303, '/app');
	};
}
