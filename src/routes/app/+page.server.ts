import { db } from '$lib/server/db';
import { passages } from '$lib/server/db/schema';
import { getUserSettings, DEFAULT_USER_SETTINGS } from '$lib/server/db/settings';
import { filterPassagesByLength, type PassageLength } from '$lib/passage-utils';
import { or, isNull, eq } from 'drizzle-orm';
import { createLogoutAction } from './login/auth-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	const settings = user
		? await getUserSettings(db, user.id)
		: {
				userId: '',
				mode: DEFAULT_USER_SETTINGS.mode,
				duration: DEFAULT_USER_SETTINGS.duration,
				passageLength: DEFAULT_USER_SETTINGS.passageLength,
				zenMode: DEFAULT_USER_SETTINGS.zenMode,
				theme: DEFAULT_USER_SETTINGS.theme,
				scrollMode: DEFAULT_USER_SETTINGS.scrollMode,
				createdAt: new Date(),
				updatedAt: new Date()
			};

	const condition = user
		? or(isNull(passages.userId), eq(passages.userId, user.id))
		: isNull(passages.userId);

	const allEligiblePassages = db
		.select()
		.from(passages)
		.where(condition)
		.all();

	let selectedPassage = null;
	const passageIdParam = url?.searchParams?.get('passageId');
	if (passageIdParam && /^\d+$/.test(passageIdParam.trim())) {
		const targetId = parseInt(passageIdParam.trim(), 10);
		selectedPassage = allEligiblePassages.find((p) => p.id === targetId) ?? null;
	}

	if (!selectedPassage) {
		const filteredPassages = filterPassagesByLength(
			allEligiblePassages,
			settings.passageLength as PassageLength
		);

		selectedPassage =
			filteredPassages.length > 0
				? filteredPassages[Math.floor(Math.random() * filteredPassages.length)]
				: null;
	}

	return {
		user,
		passage: selectedPassage,
		settings
	};
};

export const actions: Actions = {
	logout: createLogoutAction(db)
};
