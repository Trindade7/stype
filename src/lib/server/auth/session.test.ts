import { describe, expect, it } from 'vitest';
import { initializeDatabase } from '../db';
import { seedAdminUser } from '../db/seed';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import {
	createSession,
	validateSession,
	invalidateSession
} from './session';

describe('session management', () => {
	it('creates and validates an active session for a user', async () => {
		const { sqlite, db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
		expect(admin).toBeDefined();

		const session = await createSession(db, admin.id);
		expect(session.id).toBeDefined();
		expect(session.userId).toBe(admin.id);
		expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());

		const result = await validateSession(db, session.id);
		expect(result.session).toBeDefined();
		expect(result.user).toBeDefined();
		expect(result.user?.id).toBe(admin.id);
		expect(result.user?.username).toBe('admin');
		expect(result.user?.email).toBe('admin@stype.local');
		expect(result.user?.name).toBe('Admin');

		sqlite.close();
	});

	it('rejects an expired session and cleans it up from the database', async () => {
		const { sqlite, db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
		
		const session = await createSession(db, admin.id);
		// Manually set expiration in the past
		db.update(schema.sessions)
			.set({ expiresAt: new Date(Date.now() - 10000) })
			.where(eq(schema.sessions.id, session.id))
			.run();

		const result = await validateSession(db, session.id);
		expect(result.session).toBeNull();
		expect(result.user).toBeNull();

		// Ensure it was deleted from db
		const inDb = db.select().from(schema.sessions).where(eq(schema.sessions.id, session.id)).get();
		expect(inDb).toBeUndefined();

		sqlite.close();
	});

	it('invalidates a session on logout', async () => {
		const { sqlite, db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
		const session = await createSession(db, admin.id);

		await invalidateSession(db, session.id);

		const result = await validateSession(db, session.id);
		expect(result.session).toBeNull();
		expect(result.user).toBeNull();

		sqlite.close();
	});
});
