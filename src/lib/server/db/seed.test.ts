import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import { seedAdminUser } from './seed';
import { verifyPassword } from '../auth/password';

describe('database schema and admin seeding', () => {
	it('creates users and sessions tables and seeds the default admin user', async () => {
		const sqlite = new Database(':memory:');
		// Enable foreign keys
		sqlite.pragma('foreign_keys = ON');

		sqlite.exec(`
			CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				username TEXT UNIQUE NOT NULL,
				password_hash TEXT NOT NULL,
				created_at INTEGER NOT NULL
			);
			CREATE TABLE IF NOT EXISTS sessions (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				expires_at INTEGER NOT NULL,
				created_at INTEGER NOT NULL
			);
		`);

		const db = drizzle(sqlite, { schema });

		// Seed admin user
		await seedAdminUser(db);

		const adminUsers = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).all();
		expect(adminUsers.length).toBe(1);

		const admin = adminUsers[0];
		expect(admin.username).toBe('admin');
		expect(admin.passwordHash).toBeDefined();

		const passwordMatches = await verifyPassword('admin123', admin.passwordHash);
		expect(passwordMatches).toBe(true);

		// Running seedAdminUser again does not create duplicate admin
		await seedAdminUser(db);
		const countAfter = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).all().length;
		expect(countAfter).toBe(1);

		sqlite.close();
	});
});
