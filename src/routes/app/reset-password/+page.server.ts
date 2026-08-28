import { db } from '$lib/server/db';
import {
	createResetPasswordLoad,
	createResetPasswordAction
} from './reset-password-actions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = createResetPasswordLoad(db);

export const actions: Actions = {
	default: createResetPasswordAction(db)
};
