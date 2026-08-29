import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { invalidateSession } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	if (locals.session) {
		await invalidateSession(db, locals.session.id);
	}
	return json({ success: true });
};
