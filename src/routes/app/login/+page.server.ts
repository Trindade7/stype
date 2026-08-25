import { db } from '$lib/server/db';
import { createLoginAction } from './auth-actions';
import type { Actions } from './$types';

export const actions: Actions = {
	default: createLoginAction(db)
};
