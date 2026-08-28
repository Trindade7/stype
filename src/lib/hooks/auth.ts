import { error, redirect, type Handle } from '@sveltejs/kit';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { db as defaultDb } from '../server/db';
import * as schema from '../server/db/schema';
import {
	SESSION_COOKIE_NAME,
	validateSession
} from '../server/auth/session';
import { isSmtpConfigured as defaultIsSmtpConfigured } from '../server/email/delivery';

export interface AuthHandleOptions {
	isSmtpConfigured?: () => boolean;
}

export function createAuthHandle(
	db: BetterSQLite3Database<typeof schema>,
	options?: AuthHandleOptions
): Handle {
	return async ({ event, resolve }) => {
		const sessionId = event.cookies.get(SESSION_COOKIE_NAME);

		if (!sessionId) {
			event.locals.user = null;
			event.locals.session = null;
		} else {
			const { session, user } = await validateSession(db, sessionId);
			if (session && user) {
				event.locals.session = session;
				event.locals.user = user;
			} else {
				event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
				event.locals.session = null;
				event.locals.user = null;
			}
		}

		const isApiRoute = event.url.pathname.startsWith('/api') || event.url.pathname.startsWith('/app/api');
		if (isApiRoute) {
			return resolve(event);
		}

		const isAppRoute = event.url.pathname.startsWith('/app');
		const isAuthPage =
			event.url.pathname === '/app/login' ||
			event.url.pathname === '/app/signup' ||
			event.url.pathname === '/app/forgot-password' ||
			event.url.pathname === '/app/reset-password';
		const isConfirmEmailPage = event.url.pathname === '/app/confirm-email';
		const isVerifyEmailPage = event.url.pathname === '/app/verify-email';
		const isLogoutPage = event.url.pathname === '/app/logout';

		if (isAppRoute) {
			if (!event.locals.user && !isAuthPage && !isConfirmEmailPage) {
				redirect(303, '/app/login');
			}
			if (event.locals.user && isAuthPage) {
				redirect(303, '/app');
			}

			if (event.locals.user) {
				const smtpActive = options?.isSmtpConfigured ? options.isSmtpConfigured() : defaultIsSmtpConfigured();
				const isUnconfirmed = !event.locals.user.emailConfirmed && smtpActive;

				if (isUnconfirmed) {
					if (!isVerifyEmailPage && !isConfirmEmailPage && !isLogoutPage) {
						redirect(303, '/app/verify-email');
					}
				} else if (isVerifyEmailPage) {
					redirect(303, '/app');
				}
			}

			const isAdminRoute = event.url.pathname === '/app/admin' || event.url.pathname.startsWith('/app/admin/');
			if (isAdminRoute && event.locals.user?.role !== 'admin') {
				error(403, 'Forbidden');
			}
		} else {
			// Redirect authenticated users away from Guest routes to /app
			if (event.locals.user) {
				redirect(303, '/app');
			}
		}

		return resolve(event);
	};
}

export const authHandle: Handle = createAuthHandle(defaultDb);
