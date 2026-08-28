import { db } from '$lib/server/db';
import {
	createVerifyEmailLoad,
	createVerifyEmailActions
} from './verify-email-actions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = createVerifyEmailLoad(db);

export const actions: Actions = createVerifyEmailActions(db);
