import { db } from '$lib/server/db';
import { getUserSettings } from '$lib/server/db/settings';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const settings = locals.user ? await getUserSettings(db, locals.user.id) : null;
	return {
		user: locals.user,
		settings
	};
};
