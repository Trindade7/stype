import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { updateUserSettings } from '$lib/server/db/settings';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const updated = await updateUserSettings(db, locals.user.id, body);
		return json(updated);
	} catch (err) {
		return json({ error: 'Failed to update settings' }, { status: 500 });
	}
};
