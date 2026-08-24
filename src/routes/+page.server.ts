import { db } from '$lib/server/db';
import { createLogoutAction } from './login/auth-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		user: locals.user
	};
};

export const actions: Actions = {
	logout: createLogoutAction(db)
};
