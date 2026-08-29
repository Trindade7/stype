import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import type { UserSettings } from './schema';

export const DEFAULT_USER_SETTINGS = {
	mode: 'passage' as const,
	duration: 30,
	passageLength: 'all' as const,
	zenMode: false,
	theme: 'system' as const,
	scrollMode: 'center' as const
};

export async function getUserSettings(
	db: BetterSQLite3Database<typeof schema>,
	userId: string
): Promise<UserSettings> {
	const existing = db
		.select()
		.from(schema.userSettings)
		.where(eq(schema.userSettings.userId, userId))
		.get();

	if (existing) {
		return existing;
	}

	const now = new Date();
	const newSettings: UserSettings = {
		userId,
		mode: DEFAULT_USER_SETTINGS.mode,
		duration: DEFAULT_USER_SETTINGS.duration,
		passageLength: DEFAULT_USER_SETTINGS.passageLength,
		zenMode: DEFAULT_USER_SETTINGS.zenMode,
		theme: DEFAULT_USER_SETTINGS.theme,
		scrollMode: DEFAULT_USER_SETTINGS.scrollMode,
		createdAt: now,
		updatedAt: now,
		deletedAt: null
	};

	db.insert(schema.userSettings)
		.values(newSettings)
		.run();

	return newSettings;
}

export async function updateUserSettings(
	db: BetterSQLite3Database<typeof schema>,
	userId: string,
	updates: Partial<Omit<UserSettings, 'userId' | 'createdAt'>>
): Promise<UserSettings> {
	const current = await getUserSettings(db, userId);
	const now = new Date();

	const merged = {
		mode: updates.mode ?? current.mode,
		duration: updates.duration ?? current.duration,
		passageLength: updates.passageLength ?? current.passageLength,
		zenMode: updates.zenMode ?? current.zenMode,
		theme: updates.theme ?? current.theme,
		scrollMode: updates.scrollMode ?? current.scrollMode,
		updatedAt: updates.updatedAt ?? now,
		deletedAt: updates.deletedAt !== undefined ? updates.deletedAt : current.deletedAt
	};

	db.update(schema.userSettings)
		.set(merged)
		.where(eq(schema.userSettings.userId, userId))
		.run();

	return {
		...current,
		...merged
	};
}
