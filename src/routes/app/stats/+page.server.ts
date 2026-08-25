import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { testRuns } from '$lib/server/db/schema';
import { asc, eq, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/app/login');
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

	const runs = await db
		.select({
			id: testRuns.id,
			mode: testRuns.mode,
			duration: testRuns.duration,
			wpm: testRuns.wpm,
			accuracy: testRuns.accuracy,
			createdAt: testRuns.createdAt,
			timeElapsed: testRuns.timeElapsed
		})
		.from(testRuns)
		.where(eq(testRuns.userId, locals.user.id))
		.orderBy(asc(testRuns.createdAt));

	return {
		stats: {
			totalTests: Number(stats?.totalTests || 0),
			averageWpm: Number(stats?.averageWpm || 0),
			peakWpm: Number(stats?.peakWpm || 0),
			averageAccuracy: Number(stats?.averageAccuracy || 0)
		},
		runs
	};
};
