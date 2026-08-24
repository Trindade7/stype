import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});

export const passages = sqliteTable('passages', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	text: text('text').notNull(),
	source: text('source'),
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});

export interface TimelineSnapshot {
	second: number;
	wpm: number;
	accuracy: number;
	errors?: number;
}

export const testRuns = sqliteTable('test_runs', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	passageId: integer('passage_id')
		.notNull()
		.references(() => passages.id, { onDelete: 'cascade' }),
	wpm: integer('wpm').notNull(),
	accuracy: integer('accuracy').notNull(),
	timeElapsed: integer('time_elapsed').notNull(), // seconds (integer part or rounded)
	correctChars: integer('correct_chars').notNull(),
	incorrectChars: integer('incorrect_chars').notNull(),
	extraChars: integer('extra_chars').notNull(),
	missedChars: integer('missed_chars').notNull(),
	timelineSnapshots: text('timeline_snapshots', { mode: 'json' }).$type<TimelineSnapshot[]>(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Passage = typeof passages.$inferSelect;
export type NewPassage = typeof passages.$inferInsert;
export type TestRun = typeof testRuns.$inferSelect;
export type NewTestRun = typeof testRuns.$inferInsert;
