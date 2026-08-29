import { json } from '@sveltejs/kit';
import { eq, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { verifyPassword } from '$lib/server/auth/password';
import { createSession } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json().catch(() => null);
		if (!body || typeof body !== 'object') {
			return json({ error: 'Invalid request body' }, { status: 400 });
		}

		const identifier = (body.username || body.identifier)?.toString().trim();
		const password = body.password?.toString();

		if (!identifier || !password) {
			return json({ error: 'Username/email and password are required' }, { status: 400 });
		}

		const user = db
			.select()
			.from(schema.users)
			.where(or(eq(schema.users.username, identifier), eq(schema.users.email, identifier)))
			.get();

		if (!user) {
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		const isValidPassword = await verifyPassword(password, user.passwordHash);
		if (!isValidPassword) {
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		const session = await createSession(db, user.id);

		return json({
			token: session.id,
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				name: user.name,
				role: user.role
			}
		});
	} catch (err) {
		console.error('Error during API login:', err);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
