import { db } from '$lib/server/db';
import {
	createAdminUsersPageLoad,
	createAdminCreateUserAction,
	createAdminUpdateUserAction
} from './admin-users-actions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = createAdminUsersPageLoad(db);

export const actions: Actions = {
	createUser: createAdminCreateUserAction(db),
	updateUser: createAdminUpdateUserAction(db)
};
