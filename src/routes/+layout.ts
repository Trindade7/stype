import type { LayoutLoad } from './$types';
import type { SafeUser } from '$lib/server/auth/session';
import type { UserSettings } from '$lib/server/db/schema';

export const ssr = false;

export const load: LayoutLoad = () => {
	return {
		user: null as SafeUser | null,
		settings: null as UserSettings | null
	};
};
