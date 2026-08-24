import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { testRuns } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const [stats] = await db
		.select({
			totalTests: sql<number>`count(*)`,
			averageWpm: sql<number>`avg(${testRuns.wpm})`,
			peakWpm: sql<number>`max(${testRuns.wpm})`,
			averageAccuracy: sql<number>`avg(${testRuns.accuracy})`
		})
		.from(testRuns)
		.where(eq(testRuns.userId, locals.user.id));

	return {
		stats: {
			totalTests: Number(stats.totalTests || 0),
			averageWpm: Number(stats.averageWpm || 0),
			peakWpm: Number(stats.peakWpm || 0),
			averageAccuracy: Number(stats.averageAccuracy || 0)
		}
	};
};
