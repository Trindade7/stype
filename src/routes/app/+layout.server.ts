import { db } from '$lib/server/db';
import { getUserSettings } from '$lib/server/db/settings';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (process.env.STATIC_BUILD === '1' || process.env.STATIC_BUILD === 'true') {
		return {
			user: null,
			settings: null
		};
	}
	const settings = locals.user ? await getUserSettings(db, locals.user.id) : null;
	return {
		user: locals.user,
		settings
	};
};
