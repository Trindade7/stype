import { describe, it, expect } from 'vitest';
import { load } from './+page.server';

describe('/app/admin page.server', () => {
	it('redirects to /app/admin/users', async () => {
		await expect(load({} as any)).rejects.toMatchObject({
			status: 303,
			location: '/app/admin/users'
		});
	});
});
