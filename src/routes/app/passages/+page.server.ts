import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { passages } from '$lib/server/db/schema';
import { eq, or, isNull, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/app/login');
	}

	const allPassages = db
		.select()
		.from(passages)
		.where(or(isNull(passages.userId), eq(passages.userId, locals.user.id)))
		.all();

	return {
		passages: allPassages,
		user: locals.user
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}
		const data = await request.formData();
		const text = data.get('text');
		const source = data.get('source');

		if (!text || typeof text !== 'string') {
			return fail(400, { error: 'Text is required' });
		}

		await db.insert(passages).values({
			text,
			source: source && typeof source === 'string' ? source : null,
			userId: locals.user.id,
			createdAt: new Date()
		});

		return { success: true };
	},
	update: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}
		const data = await request.formData();
		const id = data.get('id');
		const text = data.get('text');
		const source = data.get('source');

		if (!id || !text || typeof text !== 'string') {
			return fail(400, { error: 'Invalid input' });
		}

		// check if the passage belongs to the user
		const existing = db.select().from(passages).where(and(eq(passages.id, Number(id)), eq(passages.userId, locals.user.id))).get();
		if (!existing) {
			return fail(403, { error: 'Forbidden' });
		}

		await db.update(passages).set({
			text,
			source: source && typeof source === 'string' ? source : null
		}).where(eq(passages.id, Number(id)));

		return { success: true };
	},
	delete: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}
		const data = await request.formData();
		const id = data.get('id');

		if (!id) {
			return fail(400, { error: 'Invalid input' });
		}

		const existing = db.select().from(passages).where(and(eq(passages.id, Number(id)), eq(passages.userId, locals.user.id))).get();
		if (!existing) {
			return fail(403, { error: 'Forbidden' });
		}

		await db.delete(passages).where(eq(passages.id, Number(id)));
		return { success: true };
	}
};
