import { redirect, fail } from '@sveltejs/kit';
import crypto from 'node:crypto';
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
		.where(
			and(
				isNull(passages.deletedAt),
				or(isNull(passages.userId), eq(passages.userId, locals.user.id))
			)
		)
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

		const now = new Date();
		await db.insert(passages).values({
			id: crypto.randomUUID(),
			text,
			source: source && typeof source === 'string' ? source : null,
			userId: locals.user.id,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
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

		if (!id || typeof id !== 'string' || !text || typeof text !== 'string') {
			return fail(400, { error: 'Invalid input' });
		}

		// check if the passage belongs to the user and is not deleted
		const existing = db
			.select()
			.from(passages)
			.where(and(eq(passages.id, id), eq(passages.userId, locals.user.id), isNull(passages.deletedAt)))
			.get();
		if (!existing) {
			return fail(403, { error: 'Forbidden' });
		}

		await db
			.update(passages)
			.set({
				text,
				source: source && typeof source === 'string' ? source : null,
				updatedAt: new Date()
			})
			.where(eq(passages.id, id));

		return { success: true };
	},
	delete: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}
		const data = await request.formData();
		const id = data.get('id');

		if (!id || typeof id !== 'string') {
			return fail(400, { error: 'Invalid input' });
		}

		const existing = db
			.select()
			.from(passages)
			.where(and(eq(passages.id, id), eq(passages.userId, locals.user.id), isNull(passages.deletedAt)))
			.get();
		if (!existing) {
			return fail(403, { error: 'Forbidden' });
		}

		const now = new Date();
		await db
			.update(passages)
			.set({
				deletedAt: now,
				updatedAt: now
			})
			.where(eq(passages.id, id));
		return { success: true };
	}
};
