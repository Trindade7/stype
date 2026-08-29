import { json } from '@sveltejs/kit';
import crypto from 'node:crypto';
import { db } from '$lib/server/db';
import { getUserSettings, updateUserSettings } from '$lib/server/db/settings';
import { passages, testRuns, userSettings } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';
import { and, eq, gt } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const data = await request.json().catch(() => ({}));
		const { settings, customPassages, testRuns: guestRuns, lastSyncedAt } = data;
		const syncTimestamp = new Date();
		const lastSyncDate = lastSyncedAt ? new Date(lastSyncedAt) : null;

		// 1. Sync settings with Last-Write-Wins based on updatedAt
		let currentSettings = await getUserSettings(db, locals.user.id);

		if (settings) {
			const clientUpdatedAt = settings.updatedAt ? new Date(settings.updatedAt) : new Date();
			const serverUpdatedAt = currentSettings?.updatedAt ?? new Date(0);

			if (!currentSettings || clientUpdatedAt.getTime() > serverUpdatedAt.getTime()) {
				currentSettings = await updateUserSettings(db, locals.user.id, {
					mode: settings.mode,
					duration: settings.duration,
					passageLength: settings.passageLength,
					zenMode: settings.zenMode,
					theme: settings.theme,
					...(settings.scrollMode ? { scrollMode: settings.scrollMode } : {}),
					updatedAt: clientUpdatedAt,
					...(settings.deletedAt !== undefined
						? { deletedAt: settings.deletedAt ? new Date(settings.deletedAt) : null }
						: {})
				});
			}
		}

		// 2. Sync custom passages bidirectionally with LWW and soft-deletes
		const existingPassages = await db.select().from(passages);
		const passageByIdMap = new Map<string, typeof existingPassages[0]>();
		const passageByTextMap = new Map<string, string>();

		for (const p of existingPassages) {
			passageByIdMap.set(p.id, p);
			if (!passageByTextMap.has(p.text)) {
				passageByTextMap.set(p.text, p.id);
			}
		}

		if (Array.isArray(customPassages)) {
			for (const cp of customPassages) {
				if (typeof cp.text !== 'string') continue;
				const cpId = typeof cp.id === 'string' && cp.id.trim() ? cp.id.trim() : (typeof cp.id === 'number' ? String(cp.id) : crypto.randomUUID());
				const clientCreatedAt = cp.createdAt ? new Date(cp.createdAt) : syncTimestamp;
				const clientUpdatedAt = cp.updatedAt ? new Date(cp.updatedAt) : clientCreatedAt;
				const clientDeletedAt = cp.deletedAt ? new Date(cp.deletedAt) : null;

				const existingById = passageByIdMap.get(cpId);
				const existingIdByText = passageByTextMap.get(cp.text);
				const existing = existingById || (existingIdByText ? passageByIdMap.get(existingIdByText) : null);

				if (!existing) {
					const [newP] = await db
						.insert(passages)
						.values({
							id: cpId,
							text: cp.text,
							source: cp.source || null,
							userId: locals.user.id,
							createdAt: clientCreatedAt,
							updatedAt: clientUpdatedAt,
							deletedAt: clientDeletedAt
						})
						.returning();
					passageByIdMap.set(newP.id, newP);
					passageByTextMap.set(newP.text, newP.id);
				} else {
					// Compare timestamps: client wins if clientUpdatedAt > existing.updatedAt
					if (clientUpdatedAt.getTime() > existing.updatedAt.getTime()) {
						await db
							.update(passages)
							.set({
								text: cp.text,
								source: cp.source !== undefined ? (cp.source || null) : existing.source,
								updatedAt: clientUpdatedAt,
								deletedAt: clientDeletedAt
							})
							.where(eq(passages.id, existing.id));

						existing.text = cp.text;
						existing.source = cp.source || null;
						existing.updatedAt = clientUpdatedAt;
						existing.deletedAt = clientDeletedAt;
					}
				}
			}
		}

		// 3. Sync test runs with append-only set union by UUID
		const userRuns = await db.select().from(testRuns).where(eq(testRuns.userId, locals.user.id));
		const existingRunIdSet = new Set(userRuns.map((r) => r.id));
		const existingRunKeySet = new Set(userRuns.map((r) => `${r.createdAt.getTime()}-${r.wpm}`));

		if (Array.isArray(guestRuns)) {
			const runsToInsert = [];
			for (const r of guestRuns) {
				if (!r.createdAt || typeof r.wpm !== 'number') continue;
				const rId = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : crypto.randomUUID();
				if (existingRunIdSet.has(rId)) continue;
				const rDate = new Date(r.createdAt);
				const key = `${rDate.getTime()}-${r.wpm}`;
				if (existingRunKeySet.has(key)) continue;

				let dbPassageId = existingPassages[0]?.id ?? 'default';
				const rPassageIdStr = String(r.passageId);

				if (passageByIdMap.has(rPassageIdStr)) {
					dbPassageId = passageByIdMap.get(rPassageIdStr)!.id;
				} else if (r.passage && typeof r.passage.text === 'string') {
					let pId = passageByTextMap.get(r.passage.text);
					if (!pId) {
						const [newP] = await db
							.insert(passages)
							.values({
								id: typeof r.passage.id === 'string' && r.passage.id.trim() ? r.passage.id.trim() : crypto.randomUUID(),
								text: r.passage.text,
								source: r.passage.source || null,
								userId: locals.user.id,
								createdAt: syncTimestamp,
								updatedAt: syncTimestamp,
								deletedAt: null
							})
							.returning();
						pId = newP.id;
						passageByIdMap.set(pId, newP);
						passageByTextMap.set(newP.text, pId);
					}
					dbPassageId = pId;
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
				existingRunKeySet.add(key);
			}

			if (runsToInsert.length > 0) {
				await db.insert(testRuns).values(runsToInsert);
			}
		}

		// 4. Query changes to return to the client
		// Custom passages to return
		const allUserPassages = await db
			.select()
			.from(passages)
			.where(
				lastSyncDate
					? and(eq(passages.userId, locals.user.id), gt(passages.updatedAt, lastSyncDate))
					: eq(passages.userId, locals.user.id)
			);

		const serverPassagesToReturn = allUserPassages.map((p) => ({
			id: p.id,
			text: p.text,
			source: p.source,
			createdAt: p.createdAt.toISOString(),
			updatedAt: p.updatedAt.toISOString(),
			deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
			isCustom: true
		}));

		// Test runs to return
		const allUserRuns = await db
			.select({
				id: testRuns.id,
				passageId: testRuns.passageId,
				mode: testRuns.mode,
				duration: testRuns.duration,
				wpm: testRuns.wpm,
				accuracy: testRuns.accuracy,
				timeElapsed: testRuns.timeElapsed,
				correctChars: testRuns.correctChars,
				incorrectChars: testRuns.incorrectChars,
				extraChars: testRuns.extraChars,
				missedChars: testRuns.missedChars,
				timelineSnapshots: testRuns.timelineSnapshots,
				createdAt: testRuns.createdAt,
				passageText: passages.text,
				passageSource: passages.source
			})
			.from(testRuns)
			.leftJoin(passages, eq(testRuns.passageId, passages.id))
			.where(
				lastSyncDate
					? and(eq(testRuns.userId, locals.user.id), gt(testRuns.createdAt, lastSyncDate))
					: eq(testRuns.userId, locals.user.id)
			);

		const serverRunsToReturn = allUserRuns.map((r) => ({
			id: r.id,
			passageId: r.passageId,
			mode: r.mode,
			duration: r.duration,
			wpm: r.wpm,
			accuracy: r.accuracy,
			timeElapsed: r.timeElapsed,
			correctChars: r.correctChars,
			incorrectChars: r.incorrectChars,
			extraChars: r.extraChars,
			missedChars: r.missedChars,
			timelineSnapshots: r.timelineSnapshots ?? [],
			createdAt: r.createdAt.toISOString(),
			passage: r.passageText
				? {
						id: r.passageId,
						text: r.passageText,
						source: r.passageSource
					}
				: null
		}));

		return json({
			success: true,
			syncedAt: syncTimestamp.toISOString(),
			settings: currentSettings
				? {
						mode: currentSettings.mode,
						duration: currentSettings.duration,
						passageLength: currentSettings.passageLength,
						zenMode: currentSettings.zenMode,
						theme: currentSettings.theme,
						scrollMode: currentSettings.scrollMode,
						updatedAt: currentSettings.updatedAt.toISOString(),
						deletedAt: currentSettings.deletedAt ? currentSettings.deletedAt.toISOString() : null
					}
				: null,
			customPassages: serverPassagesToReturn,
			testRuns: serverRunsToReturn
		});
	} catch (err) {
		console.error('Error in sync endpoint:', err);
		return json({ error: 'Sync failed' }, { status: 500 });
	}
};
