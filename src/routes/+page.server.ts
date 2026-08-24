import { db } from '$lib/server/db';
import { passages } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import { createLogoutAction } from './login/auth-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const randomPassage = db
		.select()
		.from(passages)
		.orderBy(sql`RANDOM()`)
		.limit(1)
		.get();

	return {
		user: locals.user,
		passage: randomPassage
	};
};

export const actions: Actions = {
	logout: createLogoutAction(db)
};
