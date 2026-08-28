import { db } from '$lib/server/db';
import {
	createUserPageLoad,
	createUpdateDetailsAction,
	createUpdatePasswordAction
} from './user-actions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = createUserPageLoad(db);

export const actions: Actions = {
	updateDetails: createUpdateDetailsAction(db),
	updatePassword: createUpdatePasswordAction(db)
};
