import { sequence } from '@sveltejs/kit/hooks';
import { authHandle } from '$lib/hooks/auth';

export const handle = sequence(authHandle);
