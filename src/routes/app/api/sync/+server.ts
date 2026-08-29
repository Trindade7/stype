import { json } from '@sveltejs/kit';
import crypto from 'node:crypto';
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
				...(settings.scrollMode ? { scrollMode: settings.scrollMode } : {}),
				...(settings.updatedAt ? { updatedAt: new Date(settings.updatedAt) } : {}),
				...(settings.deletedAt !== undefined ? { deletedAt: settings.deletedAt ? new Date(settings.deletedAt) : null } : {})
			});
		}

		// 2. Sync custom passages
		const passageIdMap = new Map<string, string>();
		const allPassages = await db.select().from(passages);
		const existingTextMap = new Map<string, string>();

		for (const p of allPassages) {
			existingTextMap.set(p.text, p.id);
		}

		if (Array.isArray(customPassages)) {
			for (const cp of customPassages) {
				if (typeof cp.text !== 'string') continue;
				const cpIdStr = String(cp.id);
				let dbId = existingTextMap.get(cp.text);
				if (!dbId) {
					const now = new Date();
					const createdAt = cp.createdAt ? new Date(cp.createdAt) : now;
					const updatedAt = cp.updatedAt ? new Date(cp.updatedAt) : createdAt;
					const deletedAt = cp.deletedAt ? new Date(cp.deletedAt) : null;
					const passageId = typeof cp.id === 'string' && cp.id.trim() ? cp.id.trim() : crypto.randomUUID();

					const [newP] = await db.insert(passages).values({
						id: passageId,
						text: cp.text,
						source: cp.source || null,
						userId: locals.user.id,
						createdAt,
						updatedAt,
						deletedAt
					}).returning();
					dbId = newP.id;
					existingTextMap.set(cp.text, dbId);
				} else if (cp.deletedAt) {
					await db.update(passages).set({
						deletedAt: new Date(cp.deletedAt),
						updatedAt: cp.updatedAt ? new Date(cp.updatedAt) : new Date()
					}).where(eq(passages.id, dbId));
				}
				passageIdMap.set(cpIdStr, dbId);
			}
		}

		// 3. Sync test runs
		if (Array.isArray(guestRuns)) {
			const userRuns = await db.select().from(testRuns).where(eq(testRuns.userId, locals.user.id));
			const existingRunIdSet = new Set(userRuns.map((r) => r.id));
			const existingRunSet = new Set(userRuns.map((r) => `${r.createdAt.getTime()}-${r.wpm}`));

			const runsToInsert = [];
			for (const r of guestRuns) {
				if (!r.createdAt || typeof r.wpm !== 'number') continue;
				const rId = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : crypto.randomUUID();
				if (existingRunIdSet.has(rId)) continue;
				const rDate = new Date(r.createdAt);
				const key = `${rDate.getTime()}-${r.wpm}`;
				if (existingRunSet.has(key)) continue;

				let dbPassageId = allPassages[0]?.id ?? 'default';
				const rPassageIdStr = String(r.passageId);

				if (passageIdMap.has(rPassageIdStr)) {
					dbPassageId = passageIdMap.get(rPassageIdStr)!;
				} else if (r.passage && typeof r.passage.text === 'string') {
					let pId = existingTextMap.get(r.passage.text);
					if (!pId) {
						const now = new Date();
						const passageId = typeof r.passage.id === 'string' && r.passage.id.trim() ? r.passage.id.trim() : crypto.randomUUID();
						const [newP] = await db.insert(passages).values({
							id: passageId,
							text: r.passage.text,
							source: r.passage.source || null,
							userId: locals.user.id,
							createdAt: now,
							updatedAt: now,
							deletedAt: null
						}).returning();
						pId = newP.id;
						existingTextMap.set(r.passage.text, pId);
					}
					dbPassageId = pId;
					passageIdMap.set(rPassageIdStr, dbPassageId);
				}

				runsToInsert.push({
					id: rId,
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
				existingRunIdSet.add(rId);
				existingRunSet.add(key);
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
