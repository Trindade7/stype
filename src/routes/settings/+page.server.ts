import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { getUserSettings, updateUserSettings } from '$lib/server/db/settings';
import type { PageServerLoad, Actions } from './$types';

const VALID_MODES = ['passage', 'timed'] as const;
const VALID_LENGTHS = ['all', 'short', 'medium', 'long'] as const;
const VALID_THEMES = ['light', 'dark', 'system'] as const;

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const settings = await getUserSettings(db, locals.user.id);

	return {
		user: locals.user,
		settings
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const mode = data.get('mode');
		const duration = data.get('duration');
		const passageLength = data.get('passageLength');
		const zenMode = data.get('zenMode');
		const theme = data.get('theme');

		if (mode && !VALID_MODES.includes(mode as any)) {
			return fail(400, { error: 'Invalid mode' });
		}

		let parsedDuration: number | undefined;
		if (duration !== null && duration !== undefined && duration !== '') {
			parsedDuration = Number(duration);
			if (isNaN(parsedDuration) || parsedDuration <= 0) {
				return fail(400, { error: 'Invalid duration' });
			}
		}

		if (passageLength && !VALID_LENGTHS.includes(passageLength as any)) {
			return fail(400, { error: 'Invalid passage length' });
		}

		if (theme && !VALID_THEMES.includes(theme as any)) {
			return fail(400, { error: 'Invalid theme' });
		}

		const isZenMode = zenMode === 'on' || zenMode === 'true';

		await updateUserSettings(db, locals.user.id, {
			...(mode ? { mode: mode as any } : {}),
			...(parsedDuration !== undefined ? { duration: parsedDuration } : {}),
			...(passageLength ? { passageLength: passageLength as any } : {}),
			zenMode: isZenMode,
			...(theme ? { theme: theme as any } : {})
		});

		return { success: true };
	}
};
