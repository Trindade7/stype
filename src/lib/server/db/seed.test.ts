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
				email TEXT UNIQUE,
				name TEXT,
				role TEXT NOT NULL DEFAULT 'user',
				email_confirmed INTEGER NOT NULL DEFAULT 0,
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
		expect(admin.email).toBe('admin@stype.local');
		expect(admin.name).toBe('Admin');
		expect(admin.role).toBe('admin');
		expect(admin.emailConfirmed).toBe(true);
		expect(admin.passwordHash).toBeDefined();

		const passwordMatches = await verifyPassword('admin123', admin.passwordHash);
		expect(passwordMatches).toBe(true);

		// Running seedAdminUser again does not create duplicate admin
		await seedAdminUser(db);
		const countAfter = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).all().length;
		expect(countAfter).toBe(1);

		sqlite.close();
	});

	it('updates an existing admin user lacking email and name', async () => {
		const sqlite = new Database(':memory:');
		sqlite.pragma('foreign_keys = ON');

		sqlite.exec(`
			CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				username TEXT UNIQUE NOT NULL,
				password_hash TEXT NOT NULL,
				email TEXT UNIQUE,
				name TEXT,
				role TEXT NOT NULL DEFAULT 'user',
				email_confirmed INTEGER NOT NULL DEFAULT 0,
				created_at INTEGER NOT NULL
			);
		`);

		const db = drizzle(sqlite, { schema });

		// Insert existing legacy admin without email or name
		sqlite.exec(`
			INSERT INTO users (id, username, password_hash, created_at)
			VALUES ('legacy-admin-id', 'admin', 'hash', 123456789);
		`);

		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get();
		expect(admin).toBeDefined();
		expect(admin?.email).toBe('admin@stype.local');
		expect(admin?.name).toBe('Admin');
		expect(admin?.role).toBe('admin');

		sqlite.close();
	});

	it('elevates existing admin user with user role to admin role on startup', async () => {
		const sqlite = new Database(':memory:');
		sqlite.pragma('foreign_keys = ON');

		sqlite.exec(`
			CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				username TEXT UNIQUE NOT NULL,
				password_hash TEXT NOT NULL,
				email TEXT UNIQUE,
				name TEXT,
				role TEXT NOT NULL DEFAULT 'user',
				email_confirmed INTEGER NOT NULL DEFAULT 0,
				created_at INTEGER NOT NULL
			);
		`);

		const db = drizzle(sqlite, { schema });

		// Insert existing admin with 'user' role
		sqlite.exec(`
			INSERT INTO users (id, username, password_hash, email, name, role, created_at)
			VALUES ('admin-id-1', 'admin', 'hash', 'admin@stype.local', 'Admin', 'user', 123456789);
		`);

		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get();
		expect(admin).toBeDefined();
		expect(admin?.role).toBe('admin');

		sqlite.close();
	});

	it('sets emailConfirmed to true on existing admin user when unconfirmed', async () => {
		const sqlite = new Database(':memory:');
		sqlite.pragma('foreign_keys = ON');

		sqlite.exec(`
			CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				username TEXT UNIQUE NOT NULL,
				password_hash TEXT NOT NULL,
				email TEXT UNIQUE,
				name TEXT,
				role TEXT NOT NULL DEFAULT 'user',
				email_confirmed INTEGER NOT NULL DEFAULT 0,
				created_at INTEGER NOT NULL
			);
		`);

		const db = drizzle(sqlite, { schema });

		// Insert existing admin with email_confirmed = 0
		sqlite.exec(`
			INSERT INTO users (id, username, password_hash, email, name, role, email_confirmed, created_at)
			VALUES ('admin-id-2', 'admin', 'hash', 'admin@stype.local', 'Admin', 'admin', 0, 123456789);
		`);

		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get();
		expect(admin).toBeDefined();
		expect(admin?.emailConfirmed).toBe(true);

		sqlite.close();
	});
});
