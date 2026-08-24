import { redirect, type Handle } from '@sveltejs/kit';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { db as defaultDb } from '../server/db';
import * as schema from '../server/db/schema';
import {
	SESSION_COOKIE_NAME,
	validateSession
} from '../server/auth/session';

export function createAuthHandle(
	db: BetterSQLite3Database<typeof schema>
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

		const isLoginPage = event.url.pathname === '/login';

		if (!event.locals.user && !isLoginPage) {
			redirect(303, '/login');
		}

		if (event.locals.user && isLoginPage) {
			redirect(303, '/');
		}

		return resolve(event);
	};
}

export const authHandle: Handle = createAuthHandle(defaultDb);
