import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { testRuns, passages } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const runs = await db
		.select({
			id: testRuns.id,
			mode: testRuns.mode,
			duration: testRuns.duration,
			wpm: testRuns.wpm,
			accuracy: testRuns.accuracy,
			createdAt: testRuns.createdAt,
			timeElapsed: testRuns.timeElapsed,
			passage: {
				source: passages.source,
				text: passages.text
			}
		})
		.from(testRuns)
		.innerJoin(passages, eq(testRuns.passageId, passages.id))
		.where(eq(testRuns.userId, locals.user.id))
		.orderBy(desc(testRuns.createdAt));

	return {
		runs
	};
};
