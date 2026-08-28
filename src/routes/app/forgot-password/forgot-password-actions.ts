import { fail, type RequestEvent } from '@sveltejs/kit';
import { eq, or } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/server/db/schema';
import { createPasswordResetToken } from '$lib/server/auth/reset-token';
import { sendPasswordResetEmail } from '$lib/server/email/delivery';

export interface ForgotPasswordActionOptions {
	sendEmail?: typeof sendPasswordResetEmail;
}

export const GENERIC_RESET_CONFIRMATION =
	'If an account matches that username or email, a password reset link has been sent.';

export function createForgotPasswordAction(
	db: BetterSQLite3Database<typeof schema>,
	options?: ForgotPasswordActionOptions
) {
	const sendEmail = options?.sendEmail || sendPasswordResetEmail;

	return async ({ request, url }: RequestEvent) => {
		const data = await request.formData();
		const identifier = (
			data.get('identifier') ||
			data.get('username') ||
			data.get('email')
		)
			?.toString()
			.trim();

		if (!identifier) {
			return fail(400, {
				message: 'Username or email is required',
				identifier: ''
			});
		}

		const user = db
			.select()
			.from(schema.users)
			.where(or(eq(schema.users.username, identifier), eq(schema.users.email, identifier)))
			.get();

		if (user) {
			const { token } = await createPasswordResetToken(db, user.id);
			const resetUrl = `${url.origin}/app/reset-password?token=${token}`;

			if (user.email) {
				try {
					await sendEmail({
						to: user.email,
						username: user.username,
						resetUrl
					});
				} catch (err) {
					console.error('Failed to send password reset email:', err);
				}
			} else {
				console.log(
					`[Password Reset] User ${user.username} has no email configured. Reset URL: ${resetUrl}`
				);
			}
		}

		return {
			success: true,
			message: GENERIC_RESET_CONFIRMATION
		};
	};
}
