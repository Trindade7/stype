import { db } from '$lib/server/db';
import { createForgotPasswordAction } from './forgot-password-actions';
import type { Actions } from './$types';

export const actions: Actions = {
	default: createForgotPasswordAction(db)
};
