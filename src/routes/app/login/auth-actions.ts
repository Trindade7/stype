import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { eq, or } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/server/db/schema';
import { verifyPassword } from '$lib/server/auth/password';
import {
	createSession,
	invalidateSession,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE_SECONDS
} from '$lib/server/auth/session';

export function createLoginAction(db: BetterSQLite3Database<typeof schema>) {
	return async ({ request, cookies }: RequestEvent) => {
		const data = await request.formData();
		const identifier = (data.get('username') || data.get('identifier'))?.toString().trim();
		const password = data.get('password')?.toString();

		if (!identifier || !password) {
			return fail(400, {
				message: 'Username or email and password are required',
				username: identifier || ''
			});
		}

		const user = db
			.select()
			.from(schema.users)
			.where(or(eq(schema.users.username, identifier), eq(schema.users.email, identifier)))
			.get();

		if (!user) {
			return fail(400, {
				message: 'Invalid username/email or password',
				username: identifier
			});
		}

		const isValidPassword = await verifyPassword(password, user.passwordHash);
		if (!isValidPassword) {
			return fail(400, {
				message: 'Invalid username/email or password',
				username: identifier
			});
		}

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

export function createLogoutAction(db: BetterSQLite3Database<typeof schema>) {
	return async ({ locals, cookies }: RequestEvent) => {
		if (locals.session) {
			await invalidateSession(db, locals.session.id);
		}

		cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
		locals.user = null;
		locals.session = null;

		redirect(303, '/app/login');
	};
}
