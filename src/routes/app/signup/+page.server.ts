import { db } from '$lib/server/db';
import { createSignupAction } from './signup-actions';
import type { Actions } from './$types';

export const actions: Actions = {
	default: createSignupAction(db)
};
