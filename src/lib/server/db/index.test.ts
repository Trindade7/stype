import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { eq } from 'drizzle-orm';
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
});
