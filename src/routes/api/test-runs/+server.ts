import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { testRuns } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();

	if (
		typeof data.passageId !== 'number' ||
		typeof data.wpm !== 'number' ||
		typeof data.accuracy !== 'number' ||
		typeof data.timeElapsed !== 'number' ||
		typeof data.correctChars !== 'number' ||
		typeof data.incorrectChars !== 'number' ||
		typeof data.extraChars !== 'number' ||
		typeof data.missedChars !== 'number' ||
		(data.mode !== undefined && data.mode !== 'passage' && data.mode !== 'timed')
	) {
		return json({ error: 'Invalid payload' }, { status: 400 });
	}

	if (data.timelineSnapshots !== undefined) {
		if (!Array.isArray(data.timelineSnapshots)) {
			return json({ error: 'Invalid timeline snapshots' }, { status: 400 });
		}

		for (const snapshot of data.timelineSnapshots) {
			if (
				!snapshot ||
				typeof snapshot.second !== 'number' ||
				typeof snapshot.wpm !== 'number' ||
				typeof snapshot.accuracy !== 'number'
			) {
				return json({ error: 'Invalid timeline snapshot structure' }, { status: 400 });
			}
		}
	}

	try {
		const [run] = await db
			.insert(testRuns)
			.values({
				userId: locals.user.id,
				passageId: data.passageId,
				mode: data.mode ?? 'passage',
				duration: data.duration ?? null,
				wpm: data.wpm,
				accuracy: data.accuracy,
				timeElapsed: data.timeElapsed,
				correctChars: data.correctChars,
				incorrectChars: data.incorrectChars,
				extraChars: data.extraChars,
				missedChars: data.missedChars,
				timelineSnapshots: data.timelineSnapshots ?? [],
				createdAt: new Date()
			})
			.returning();

		return json(run);
	} catch (err) {
		console.error('Error saving test run:', err);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
