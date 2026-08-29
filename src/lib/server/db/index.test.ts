import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { initializeDatabase } from './index';
import { seedAdminUser } from './seed';
import * as schema from './schema';

describe('database initialization', () => {
	it('initializes in-memory database with tables and allows admin seeding', async () => {
		const { sqlite, db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get();
		expect(admin).toBeDefined();
		expect(admin?.username).toBe('admin');
		expect(admin?.email).toBe('admin@stype.local');
		expect(admin?.name).toBe('Admin');
		expect(admin?.role).toBe('admin');
		expect(admin?.emailConfirmed).toBe(true);

		sqlite.close();
	});

	it('applies safe idempotent column additions to existing users table without data loss', () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stype-test-'));
		const dbPath = path.join(tmpDir, 'test.db');

		try {
			// Simulate existing pre-migration database without email and name columns
			const rawDb = new Database(dbPath);
			rawDb.exec(`
				CREATE TABLE users (
					id TEXT PRIMARY KEY,
					username TEXT UNIQUE NOT NULL,
					password_hash TEXT NOT NULL,
					created_at INTEGER NOT NULL
				);
				INSERT INTO users (id, username, password_hash, created_at)
				VALUES ('u1', 'existinguser', 'hash123', 1700000000000);
			`);
			rawDb.close();

			// Run initializeDatabase on existing db file
			const { sqlite, db } = initializeDatabase(dbPath);

			// Verify existing row is preserved
			const existingUser = db.select().from(schema.users).where(eq(schema.users.username, 'existinguser')).get();
			expect(existingUser).toBeDefined();
			expect(existingUser?.id).toBe('u1');
			expect(existingUser?.email).toBeNull();
			expect(existingUser?.name).toBeNull();

			// Verify we can update email and name on existing user
			db.update(schema.users)
				.set({ email: 'existing@example.com', name: 'Existing User' })
				.where(eq(schema.users.id, 'u1'))
				.run();

			const updatedUser = db.select().from(schema.users).where(eq(schema.users.id, 'u1')).get();
			expect(updatedUser?.email).toBe('existing@example.com');
			expect(updatedUser?.name).toBe('Existing User');

			// Verify unique email constraint is enforced
			expect(() => {
				db.insert(schema.users)
					.values({
						id: 'u2',
						username: 'otheruser',
						email: 'existing@example.com',
						passwordHash: 'hash456',
						createdAt: new Date()
					})
					.run();
			}).toThrow();

			// Verify running initializeDatabase again on same db is idempotent
			const secondInit = initializeDatabase(dbPath);
			secondInit.sqlite.close();

			sqlite.close();
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it('creates password_reset_tokens table idempotently and enforces user foreign key with cascade delete', () => {
		const { sqlite, db } = initializeDatabase(':memory:');

		// Insert user
		const userId = 'user-reset-test';
		db.insert(schema.users)
			.values({
				id: userId,
				username: 'resetuser',
				email: 'reset@example.com',
				passwordHash: 'hash123',
				createdAt: new Date()
			})
			.run();

		// Insert password reset token
		const now = Date.now();
		const expiresAt = new Date(now + 15 * 60 * 1000);
		db.insert(schema.passwordResetTokens)
			.values({
				id: 'token-id-1',
				userId,
				tokenHash: 'hashed-token-value',
				expiresAt,
				createdAt: new Date(now)
			})
			.run();

		// Verify token was stored and retrievable
		const token = db
			.select()
			.from(schema.passwordResetTokens)
			.where(eq(schema.passwordResetTokens.id, 'token-id-1'))
			.get();

		expect(token).toBeDefined();
		expect(token?.userId).toBe(userId);
		expect(token?.tokenHash).toBe('hashed-token-value');
		expect(token?.expiresAt.getTime()).toBe(expiresAt.getTime());

		// Verify cascade delete when user is deleted
		db.delete(schema.users).where(eq(schema.users.id, userId)).run();
		const tokensAfterUserDelete = db.select().from(schema.passwordResetTokens).all();
		expect(tokensAfterUserDelete.length).toBe(0);

		sqlite.close();
	});

	it('applies password_reset_tokens table idempotently for pre-existing database stores without table', () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stype-reset-migration-'));
		const dbPath = path.join(tmpDir, 'legacy.db');

		try {
			// Simulate existing SQLite database without password_reset_tokens table
			const rawDb = new Database(dbPath);
			rawDb.exec(`
				CREATE TABLE users (
					id TEXT PRIMARY KEY,
					username TEXT UNIQUE NOT NULL,
					password_hash TEXT NOT NULL,
					email TEXT UNIQUE,
					name TEXT,
					created_at INTEGER NOT NULL
				);
				INSERT INTO users (id, username, password_hash, email, created_at)
				VALUES ('u-legacy', 'legacyuser', 'hash999', 'legacy@stype.local', 1700000000000);
			`);
			rawDb.close();

			// Run initializeDatabase on existing legacy db
			const { sqlite, db } = initializeDatabase(dbPath);

			// Verify existing user is intact
			const user = db.select().from(schema.users).where(eq(schema.users.id, 'u-legacy')).get();
			expect(user).toBeDefined();
			expect(user?.username).toBe('legacyuser');

			// Verify password_reset_tokens table is now available and can store tokens
			db.insert(schema.passwordResetTokens)
				.values({
					id: 'token-legacy-1',
					userId: 'u-legacy',
					tokenHash: 'legacy-token-hash',
					expiresAt: new Date(Date.now() + 900000),
					createdAt: new Date()
				})
				.run();

			const insertedToken = db
				.select()
				.from(schema.passwordResetTokens)
				.where(eq(schema.passwordResetTokens.id, 'token-legacy-1'))
				.get();
			expect(insertedToken).toBeDefined();
			expect(insertedToken?.userId).toBe('u-legacy');

			// Running initializeDatabase again must be completely idempotent
			const reinit = initializeDatabase(dbPath);
			reinit.sqlite.close();

			sqlite.close();
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it('applies role column idempotently to existing users table and defaults to user', () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stype-role-migration-'));
		const dbPath = path.join(tmpDir, 'legacy-role.db');

		try {
			// Simulate existing SQLite database without role column
			const rawDb = new Database(dbPath);
			rawDb.exec(`
				CREATE TABLE users (
					id TEXT PRIMARY KEY,
					username TEXT UNIQUE NOT NULL,
					password_hash TEXT NOT NULL,
					email TEXT UNIQUE,
					name TEXT,
					created_at INTEGER NOT NULL
				);
				INSERT INTO users (id, username, password_hash, email, name, created_at)
				VALUES ('u-role-test', 'regularuser', 'hash888', 'reg@stype.local', 'Reg User', 1700000000000);
			`);
			rawDb.close();

			// Run initializeDatabase on existing db
			const { sqlite, db } = initializeDatabase(dbPath);

			// Existing user should have defaulted to 'user' role
			const existingUser = db.select().from(schema.users).where(eq(schema.users.id, 'u-role-test')).get();
			expect(existingUser).toBeDefined();
			expect(existingUser?.role).toBe('user');

			// New users default to 'user' role when omitted
			db.insert(schema.users)
				.values({
					id: 'u-role-new',
					username: 'newdefaultuser',
					passwordHash: 'hash777',
					createdAt: new Date()
				})
				.run();

			const newUser = db.select().from(schema.users).where(eq(schema.users.id, 'u-role-new')).get();
			expect(newUser?.role).toBe('user');

			// Users can have 'admin' role
			db.insert(schema.users)
				.values({
					id: 'u-role-admin',
					username: 'adminuser',
					passwordHash: 'hash666',
					role: 'admin',
					createdAt: new Date()
				})
				.run();

			const adminUser = db.select().from(schema.users).where(eq(schema.users.id, 'u-role-admin')).get();
			expect(adminUser?.role).toBe('admin');

			// Re-running initialization is idempotent
			const reinit = initializeDatabase(dbPath);
			reinit.sqlite.close();

			sqlite.close();
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it('creates email_confirmation_tokens table idempotently and enforces user foreign key with cascade delete', () => {
		const { sqlite, db } = initializeDatabase(':memory:');

		// Insert user
		const userId = 'user-confirm-test';
		db.insert(schema.users)
			.values({
				id: userId,
				username: 'confirmuser',
				email: 'confirm@example.com',
				passwordHash: 'hash123',
				emailConfirmed: false,
				createdAt: new Date()
			})
			.run();

		// Insert email confirmation token
		const now = Date.now();
		const expiresAt = new Date(now + 60 * 60 * 1000);
		db.insert(schema.emailConfirmationTokens)
			.values({
				id: 'token-confirm-1',
				userId,
				tokenHash: 'hashed-confirm-token-value',
				expiresAt,
				createdAt: new Date(now)
			})
			.run();

		// Verify token was stored and retrievable
		const token = db
			.select()
			.from(schema.emailConfirmationTokens)
			.where(eq(schema.emailConfirmationTokens.id, 'token-confirm-1'))
			.get();

		expect(token).toBeDefined();
		expect(token?.userId).toBe(userId);
		expect(token?.tokenHash).toBe('hashed-confirm-token-value');
		expect(token?.expiresAt.getTime()).toBe(expiresAt.getTime());

		// Verify cascade delete when user is deleted
		db.delete(schema.users).where(eq(schema.users.id, userId)).run();
		const tokensAfterUserDelete = db.select().from(schema.emailConfirmationTokens).all();
		expect(tokensAfterUserDelete.length).toBe(0);

		sqlite.close();
	});

	it('applies email_confirmed column and email_confirmation_tokens table idempotently to existing stores', () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stype-confirm-migration-'));
		const dbPath = path.join(tmpDir, 'legacy-confirm.db');

		try {
			// Simulate existing SQLite database without email_confirmed column and without token table
			const rawDb = new Database(dbPath);
			rawDb.exec(`
				CREATE TABLE users (
					id TEXT PRIMARY KEY,
					username TEXT UNIQUE NOT NULL,
					password_hash TEXT NOT NULL,
					email TEXT UNIQUE,
					name TEXT,
					role TEXT NOT NULL DEFAULT 'user',
					created_at INTEGER NOT NULL
				);
				INSERT INTO users (id, username, password_hash, email, name, role, created_at)
				VALUES ('u-legacy-confirm', 'confirmlegacy', 'hash999', 'legacy-confirm@stype.local', 'Legacy Confirm', 'user', 1700000000000);
			`);
			rawDb.close();

			// Run initializeDatabase on existing legacy db
			const { sqlite, db } = initializeDatabase(dbPath);

			// Verify existing user now has emailConfirmed defaulted to false
			const user = db.select().from(schema.users).where(eq(schema.users.id, 'u-legacy-confirm')).get();
			expect(user).toBeDefined();
			expect(user?.emailConfirmed).toBe(false);

			// Verify email_confirmation_tokens table is now available and can store tokens
			db.insert(schema.emailConfirmationTokens)
				.values({
					id: 'token-legacy-confirm-1',
					userId: 'u-legacy-confirm',
					tokenHash: 'legacy-confirm-hash',
					expiresAt: new Date(Date.now() + 3600000),
					createdAt: new Date()
				})
				.run();

			// Running initializeDatabase again must be completely idempotent
			const reinit = initializeDatabase(dbPath);
			reinit.sqlite.close();

			sqlite.close();
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it('initializes passages, test_runs, and user_settings with UUID and timestamp schema', () => {
		const { sqlite } = initializeDatabase(':memory:');

		const passagesCols = sqlite.pragma('table_info(passages)') as { name: string; type: string }[];
		const testRunsCols = sqlite.pragma('table_info(test_runs)') as { name: string; type: string }[];
		const settingsCols = sqlite.pragma('table_info(user_settings)') as { name: string; type: string }[];

		const passageId = passagesCols.find((c) => c.name === 'id');
		expect(passageId?.type.toUpperCase()).toBe('TEXT');
		expect(passagesCols.some((c) => c.name === 'updated_at')).toBe(true);
		expect(passagesCols.some((c) => c.name === 'deleted_at')).toBe(true);

		const runId = testRunsCols.find((c) => c.name === 'id');
		const runPassageId = testRunsCols.find((c) => c.name === 'passage_id');
		expect(runId?.type.toUpperCase()).toBe('TEXT');
		expect(runPassageId?.type.toUpperCase()).toBe('TEXT');

		expect(settingsCols.some((c) => c.name === 'updated_at')).toBe(true);
		expect(settingsCols.some((c) => c.name === 'deleted_at')).toBe(true);

		sqlite.close();
	});

	it('migrates legacy integer-based passages and test_runs to UUIDs maintaining relational integrity', () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stype-uuid-migration-'));
		const dbPath = path.join(tmpDir, 'legacy-integer.db');

		try {
			const rawDb = new Database(dbPath);
			rawDb.pragma('foreign_keys = ON');
			rawDb.exec(`
				CREATE TABLE users (
					id TEXT PRIMARY KEY,
					username TEXT UNIQUE NOT NULL,
					password_hash TEXT NOT NULL,
					created_at INTEGER NOT NULL
				);
				CREATE TABLE passages (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					text TEXT NOT NULL,
					source TEXT,
					user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
					created_at INTEGER NOT NULL
				);
				CREATE TABLE test_runs (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
					passage_id INTEGER NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
					mode TEXT NOT NULL DEFAULT 'passage',
					duration INTEGER,
					wpm INTEGER NOT NULL,
					accuracy INTEGER NOT NULL,
					time_elapsed INTEGER NOT NULL,
					correct_chars INTEGER NOT NULL,
					incorrect_chars INTEGER NOT NULL,
					extra_chars INTEGER NOT NULL,
					missed_chars INTEGER NOT NULL,
					timeline_snapshots TEXT,
					created_at INTEGER NOT NULL
				);

				INSERT INTO users (id, username, password_hash, created_at)
				VALUES ('u-mig', 'miguser', 'hash123', 1700000000000);

				INSERT INTO passages (id, text, source, user_id, created_at)
				VALUES (1, 'Passage one', 'Book 1', 'u-mig', 1700000001000);
				INSERT INTO passages (id, text, source, user_id, created_at)
				VALUES (2, 'Passage two', 'Book 2', 'u-mig', 1700000002000);

				INSERT INTO test_runs (id, user_id, passage_id, mode, wpm, accuracy, time_elapsed, correct_chars, incorrect_chars, extra_chars, missed_chars, created_at)
				VALUES (101, 'u-mig', 1, 'passage', 65, 98, 30, 100, 2, 0, 0, 1700000003000);
				INSERT INTO test_runs (id, user_id, passage_id, mode, wpm, accuracy, time_elapsed, correct_chars, incorrect_chars, extra_chars, missed_chars, created_at)
				VALUES (102, 'u-mig', 2, 'timed', 75, 100, 60, 200, 0, 0, 0, 1700000004000);
			`);
			rawDb.close();

			// Run initializeDatabase to apply migration
			const { sqlite, db } = initializeDatabase(dbPath);

			const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

			// Verify passages migrated to UUID
			const migratedPassages = db.select().from(schema.passages).all();
			expect(migratedPassages).toHaveLength(2);
			for (const p of migratedPassages) {
				expect(p.id).toMatch(uuidRegex);
				expect(p.createdAt).toBeDefined();
				expect(p.updatedAt).toBeDefined();
				expect(p.deletedAt).toBeNull();
			}

			const p1 = migratedPassages.find((p) => p.text === 'Passage one')!;
			const p2 = migratedPassages.find((p) => p.text === 'Passage two')!;
			expect(p1).toBeDefined();
			expect(p2).toBeDefined();

			// Verify test_runs migrated to UUID and foreign keys point to new UUID passage IDs
			const migratedRuns = db.select().from(schema.testRuns).all();
			expect(migratedRuns).toHaveLength(2);
			for (const r of migratedRuns) {
				expect(r.id).toMatch(uuidRegex);
			}

			const run1 = migratedRuns.find((r) => r.wpm === 65)!;
			const run2 = migratedRuns.find((r) => r.wpm === 75)!;
			expect(run1).toBeDefined();
			expect(run1.passageId).toBe(p1.id);
			expect(run2).toBeDefined();
			expect(run2.passageId).toBe(p2.id);

			// Verify relational integrity
			const fkCheck = sqlite.pragma('foreign_key_check') as any[];
			expect(fkCheck).toEqual([]);

			// Re-running initialization is idempotent
			const secondInit = initializeDatabase(dbPath);
			secondInit.sqlite.close();

			sqlite.close();
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it('supports soft-deleting passages via deleted_at timestamp', () => {
		const { sqlite, db } = initializeDatabase(':memory:');

		const passageId = crypto.randomUUID();
		const now = new Date();

		db.insert(schema.passages)
			.values({
				id: passageId,
				text: 'Passage for soft-delete test',
				source: 'Soft Delete Test',
				createdAt: now,
				updatedAt: now,
				deletedAt: null
			})
			.run();

		const stored = db.select().from(schema.passages).where(eq(schema.passages.id, passageId)).get();
		expect(stored).toBeDefined();
		expect(stored?.deletedAt).toBeNull();

		// Soft delete the passage
		const deletedAt = new Date();
		db.update(schema.passages)
			.set({
				deletedAt,
				updatedAt: deletedAt
			})
			.where(eq(schema.passages.id, passageId))
			.run();

		const softDeleted = db.select().from(schema.passages).where(eq(schema.passages.id, passageId)).get();
		expect(softDeleted).toBeDefined();
		expect(softDeleted?.deletedAt).toBeDefined();
		expect(softDeleted?.deletedAt?.getTime()).toBe(deletedAt.getTime());

		sqlite.close();
	});
});
