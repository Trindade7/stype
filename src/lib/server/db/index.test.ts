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
});
