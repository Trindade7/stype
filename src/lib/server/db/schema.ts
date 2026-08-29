import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import crypto from 'node:crypto';

export type UserRole = 'admin' | 'user';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	email: text('email').unique(),
	name: text('name'),
	role: text('role').$type<UserRole>().notNull().default('user'),
	emailConfirmed: integer('email_confirmed', { mode: 'boolean' }).notNull().default(false),
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
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	text: text('text').notNull(),
	source: text('source'),
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	deletedAt: integer('deleted_at', { mode: 'timestamp_ms' })
});

export interface TimelineSnapshot {
	second: number;
	wpm: number;
	accuracy: number;
	errors?: number;
}

export const testRuns = sqliteTable('test_runs', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	passageId: text('passage_id')
		.notNull()
		.references(() => passages.id, { onDelete: 'cascade' }),
	mode: text('mode').$type<'passage' | 'timed'>().notNull().default('passage'),
	duration: integer('duration'),
	wpm: integer('wpm').notNull(),
	accuracy: integer('accuracy').notNull(),
	timeElapsed: integer('time_elapsed').notNull(), // seconds (integer part or rounded)
	correctChars: integer('correct_chars').notNull(),
	incorrectChars: integer('incorrect_chars').notNull(),
	extraChars: integer('extra_chars').notNull(),
	missedChars: integer('missed_chars').notNull(),
	timelineSnapshots: text('timeline_snapshots', { mode: 'json' }).$type<TimelineSnapshot[]>(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const userSettings = sqliteTable('user_settings', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	mode: text('mode').$type<'passage' | 'timed'>().notNull().default('passage'),
	duration: integer('duration').notNull().default(30),
	passageLength: text('passage_length').$type<'all' | 'short' | 'medium' | 'long'>().notNull().default('all'),
	zenMode: integer('zen_mode', { mode: 'boolean' }).notNull().default(false),
	theme: text('theme').$type<'light' | 'dark' | 'system'>().notNull().default('system'),
	scrollMode: text('scroll_mode').$type<'manual' | 'center' | 'step'>().notNull().default('center'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	deletedAt: integer('deleted_at', { mode: 'timestamp_ms' })
});

export const passwordResetTokens = sqliteTable('password_reset_tokens', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	tokenHash: text('token_hash').notNull().unique(),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});

export const emailConfirmationTokens = sqliteTable('email_confirmation_tokens', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	tokenHash: text('token_hash').notNull().unique(),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
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
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type EmailConfirmationToken = typeof emailConfirmationTokens.$inferSelect;
export type NewEmailConfirmationToken = typeof emailConfirmationTokens.$inferInsert;

