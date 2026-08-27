import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { updateUserSettings } from '$lib/server/db/settings';
import { passages, testRuns } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const data = await request.json();
		const { settings, customPassages, testRuns: guestRuns } = data;

		// 1. Sync settings
		if (settings) {
			await updateUserSettings(db, locals.user.id, {
				mode: settings.mode,
				duration: settings.duration,
				passageLength: settings.passageLength,
				zenMode: settings.zenMode,
				theme: settings.theme,
				...(settings.scrollMode ? { scrollMode: settings.scrollMode } : {})
			});
		}

		// 2. Sync custom passages
		const passageIdMap = new Map<number, number>();
		const allPassages = await db.select().from(passages);
		const existingTextMap = new Map<string, number>();
		
		for (const p of allPassages) {
			existingTextMap.set(p.text, p.id);
		}

		if (Array.isArray(customPassages)) {
			for (const cp of customPassages) {
				if (typeof cp.text !== 'string') continue;
				let dbId = existingTextMap.get(cp.text);
				if (!dbId) {
					const [newP] = await db.insert(passages).values({
						text: cp.text,
						source: cp.source || null,
						userId: locals.user.id,
						createdAt: cp.createdAt ? new Date(cp.createdAt) : new Date()
					}).returning();
					dbId = newP.id;
					existingTextMap.set(cp.text, dbId);
				}
				passageIdMap.set(cp.id, dbId);
			}
		}

		// 3. Sync test runs
		if (Array.isArray(guestRuns)) {
			const userRuns = await db.select().from(testRuns).where(eq(testRuns.userId, locals.user.id));
			const existingRunSet = new Set(userRuns.map(r => `${r.createdAt.getTime()}-${r.wpm}`));

			const runsToInsert = [];
			for (const r of guestRuns) {
				if (!r.createdAt || typeof r.wpm !== 'number') continue;
				const rDate = new Date(r.createdAt);
				const key = `${rDate.getTime()}-${r.wpm}`;
				if (existingRunSet.has(key)) continue;

				let dbPassageId = 1;
				
				if (passageIdMap.has(r.passageId)) {
					dbPassageId = passageIdMap.get(r.passageId)!;
				} else if (r.passage && typeof r.passage.text === 'string') {
					let pId = existingTextMap.get(r.passage.text);
					if (!pId) {
						const [newP] = await db.insert(passages).values({
							text: r.passage.text,
							source: r.passage.source || null,
							userId: locals.user.id,
							createdAt: new Date()
						}).returning();
						pId = newP.id;
						existingTextMap.set(r.passage.text, pId);
					}
					dbPassageId = pId;
					passageIdMap.set(r.passageId, dbPassageId);
				}

				runsToInsert.push({
					userId: locals.user.id,
					passageId: dbPassageId,
					mode: r.mode || 'passage',
					duration: r.duration || null,
					wpm: r.wpm,
					accuracy: r.accuracy || 0,
					timeElapsed: r.timeElapsed || 0,
					correctChars: r.correctChars || 0,
					incorrectChars: r.incorrectChars || 0,
					extraChars: r.extraChars || 0,
					missedChars: r.missedChars || 0,
					timelineSnapshots: r.timelineSnapshots || [],
					createdAt: rDate
				});
			}

			if (runsToInsert.length > 0) {
				await db.insert(testRuns).values(runsToInsert);
			}
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error in sync endpoint:', err);
		return json({ error: 'Sync failed' }, { status: 500 });
	}
};
