import { db } from '$lib/server/db';
import { createConfirmEmailLoad } from './confirm-email-actions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = createConfirmEmailLoad(db);
