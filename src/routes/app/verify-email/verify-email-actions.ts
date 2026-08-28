import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/server/db/schema';
import {
	createEmailConfirmationToken
} from '$lib/server/auth/confirmation-token';
import {
	invalidateSession,
	SESSION_COOKIE_NAME
} from '$lib/server/auth/session';
import {
	isSmtpConfigured as defaultIsSmtpConfigured,
	sendEmailConfirmationEmail,
	type EmailConfirmationEmailOptions
} from '$lib/server/email/delivery';

export interface VerifyEmailActionOptions {
	isSmtpConfigured?: () => boolean;
	sendEmail?: (options: EmailConfirmationEmailOptions) => Promise<{ delivered: boolean; mode: 'smtp' | 'console' }>;
}

export function createVerifyEmailLoad(db: BetterSQLite3Database<typeof schema>) {
	return async ({ locals }: RequestEvent) => {
		if (!locals.user) {
			redirect(303, '/app/login');
		}

		return {
			email: locals.user.email ?? ''
		};
	};
}

export function createVerifyEmailActions(
	db: BetterSQLite3Database<typeof schema>,
	options?: VerifyEmailActionOptions
) {
	return {
		resend: async ({ locals, url }: RequestEvent) => {
			if (!locals.user) {
				redirect(303, '/app/login');
			}

			if (locals.user.emailConfirmed) {
				redirect(303, '/app');
			}

			if (!locals.user.email) {
				return fail(400, {
					message: 'No email address is associated with this account.'
				});
			}

			const { token } = await createEmailConfirmationToken(db, locals.user.id);
			const origin = url?.origin ?? '';
			const confirmUrl = `${origin}/app/confirm-email?token=${token}`;

			const mailer = options?.sendEmail || sendEmailConfirmationEmail;
			await mailer({
				to: locals.user.email,
				username: locals.user.username,
				confirmUrl
			});

			return {
				success: true,
				message: `A new confirmation link has been sent to ${locals.user.email}.`
			};
		},

		logout: async ({ locals, cookies }: RequestEvent) => {
			if (locals.session) {
				await invalidateSession(db, locals.session.id);
			}

			cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
			locals.user = null;
			locals.session = null;

			redirect(303, '/app/login');
		}
	};
}
