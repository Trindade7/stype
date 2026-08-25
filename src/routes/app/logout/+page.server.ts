import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createLogoutAction } from '../login/auth-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	redirect(303, '/app');
};

export const actions: Actions = {
	default: createLogoutAction(db)
};
