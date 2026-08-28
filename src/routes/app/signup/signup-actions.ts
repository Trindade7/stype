import { randomUUID } from 'node:crypto';
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
import {
	createSession,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE_SECONDS
} from '$lib/server/auth/session';

export function createSignupAction(db: BetterSQLite3Database<typeof schema>) {
	return async ({ request, cookies }: RequestEvent) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		const username = data.get('username')?.toString().trim() ?? '';
		const email = data.get('email')?.toString().trim() ?? '';
		const password = data.get('password')?.toString() ?? '';

		if (name.length < 1 || name.length > 50) {
			return fail(400, {
				message: 'Display name must be between 1 and 50 characters',
				name,
				username,
				email
			});
		}

		const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
		if (!usernameRegex.test(username)) {
			return fail(400, {
				message: 'Username must be between 3 and 20 alphanumeric characters, hyphens, or underscores',
				name,
				username,
				email
			});
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return fail(400, {
				message: 'Please enter a valid email address',
				name,
				username,
				email
			});
		}

		if (password.length < 8) {
			return fail(400, {
				message: 'Password must be at least 8 characters',
				name,
				username,
				email
			});
		}

		const existingUsername = db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.username, username))
			.get();

		if (existingUsername) {
			return fail(400, {
				message: 'Username is already taken',
				name,
				username,
				email
			});
		}

		const existingEmail = db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.email, email))
			.get();

		if (existingEmail) {
			return fail(400, {
				message: 'Email is already registered',
				name,
				username,
				email
			});
		}

		const passwordHash = await hashPassword(password);
		const userId = randomUUID();
		const now = new Date();

		db.insert(schema.users)
			.values({
				id: userId,
				username,
				email,
				name,
				passwordHash,
				createdAt: now
			})
			.run();

		const session = await createSession(db, userId);

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
