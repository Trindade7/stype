import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import { seedAdminUser } from './seed';
import { verifyPassword } from '../auth/password';

describe('database schema and admin seeding', () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.INITIAL_ADMIN_PASSWORD;
		delete process.env.INITIAL_ADMIN_EMAIL;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	function createTestDb() {
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
			CREATE TABLE IF NOT EXISTS sessions (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				expires_at INTEGER NOT NULL,
				created_at INTEGER NOT NULL
			);
		`);
		const db = drizzle(sqlite, { schema });
		return { sqlite, db };
	}

	it('creates users and sessions tables and seeds the default admin user', async () => {
		const { sqlite, db } = createTestDb();

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
		const { sqlite, db } = createTestDb();

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
		const { sqlite, db } = createTestDb();

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
		const { sqlite, db } = createTestDb();

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

	it('honors INITIAL_ADMIN_PASSWORD and INITIAL_ADMIN_EMAIL environment variables', async () => {
		process.env.INITIAL_ADMIN_PASSWORD = 'custom-secure-password-456';
		process.env.INITIAL_ADMIN_EMAIL = 'custom-admin@example.org';

		const { sqlite, db } = createTestDb();

		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get();
		expect(admin).toBeDefined();
		expect(admin?.email).toBe('custom-admin@example.org');

		const customPasswordMatches = await verifyPassword('custom-secure-password-456', admin!.passwordHash);
		expect(customPasswordMatches).toBe(true);

		sqlite.close();
	});

	it('falls back to default email when INITIAL_ADMIN_EMAIL is omitted', async () => {
		process.env.INITIAL_ADMIN_PASSWORD = 'custom-only-password-789';

		const { sqlite, db } = createTestDb();

		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get();
		expect(admin).toBeDefined();
		expect(admin?.email).toBe('admin@stype.local');

		const passwordMatches = await verifyPassword('custom-only-password-789', admin!.passwordHash);
		expect(passwordMatches).toBe(true);

		sqlite.close();
	});

	it('falls back to default password when INITIAL_ADMIN_PASSWORD is omitted', async () => {
		process.env.INITIAL_ADMIN_EMAIL = 'admin-only-email@example.org';

		const { sqlite, db } = createTestDb();

		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get();
		expect(admin).toBeDefined();
		expect(admin?.email).toBe('admin-only-email@example.org');

		const defaultPasswordMatches = await verifyPassword('admin123', admin!.passwordHash);
		expect(defaultPasswordMatches).toBe(true);

		sqlite.close();
	});

	it('falls back to default credentials when environment variables are empty strings', async () => {
		process.env.INITIAL_ADMIN_PASSWORD = '';
		process.env.INITIAL_ADMIN_EMAIL = '';

		const { sqlite, db } = createTestDb();

		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get();
		expect(admin).toBeDefined();
		expect(admin?.email).toBe('admin@stype.local');

		const defaultPasswordMatches = await verifyPassword('admin123', admin!.passwordHash);
		expect(defaultPasswordMatches).toBe(true);

		sqlite.close();
	});

	it('does not overwrite existing admin password or email on subsequent seed runs', async () => {
		process.env.INITIAL_ADMIN_PASSWORD = 'first-password';
		process.env.INITIAL_ADMIN_EMAIL = 'first@example.org';

		const { sqlite, db } = createTestDb();

		await seedAdminUser(db);

		const adminFirst = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get();
		expect(adminFirst?.email).toBe('first@example.org');
		expect(await verifyPassword('first-password', adminFirst!.passwordHash)).toBe(true);

		// Now change environment variables and run seeding again
		process.env.INITIAL_ADMIN_PASSWORD = 'changed-password';
		process.env.INITIAL_ADMIN_EMAIL = 'changed@example.org';

		await seedAdminUser(db);

		const adminSecond = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get();
		expect(adminSecond?.email).toBe('first@example.org');
		expect(await verifyPassword('first-password', adminSecond!.passwordHash)).toBe(true);
		expect(await verifyPassword('changed-password', adminSecond!.passwordHash)).toBe(false);

		sqlite.close();
	});
});
