import { describe, expect, it } from 'vitest';
import { initializeDatabase } from '../db';
import { seedAdminUser } from '../db/seed';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import {
	createSession,
	validateSession,
	invalidateSession,
	invalidateUserSessions
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
		expect(result.user?.role).toBe('admin');

		sqlite.close();
	});

	it('exposes default user role when validating regular user session', async () => {
		const { sqlite, db } = initializeDatabase(':memory:');

		db.insert(schema.users)
			.values({
				id: 'regular-user-id',
				username: 'regularuser',
				email: 'user@stype.local',
				name: 'Regular User',
				passwordHash: 'hash',
				createdAt: new Date()
			})
			.run();

		const session = await createSession(db, 'regular-user-id');
		const result = await validateSession(db, session.id);

		expect(result.user).toBeDefined();
		expect(result.user?.role).toBe('user');
		expect(result.user?.emailConfirmed).toBe(false);

		sqlite.close();
	});

	it('returns emailConfirmed true for confirmed users in validateSession', async () => {
		const { sqlite, db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;
		const session = await createSession(db, admin.id);
		const result = await validateSession(db, session.id);

		expect(result.user).toBeDefined();
		expect(result.user?.emailConfirmed).toBe(true);

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

	it('invalidates all sessions for a specific user without affecting other users', async () => {
		const { sqlite, db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get()!;

		// Insert another user
		db.insert(schema.users)
			.values({
				id: 'other-user-id',
				username: 'otheruser',
				email: 'other@example.com',
				passwordHash: 'hash',
				createdAt: new Date()
			})
			.run();

		// Create two sessions for admin
		const adminSession1 = await createSession(db, admin.id);
		const adminSession2 = await createSession(db, admin.id);

		// Create one session for other user
		const otherSession = await createSession(db, 'other-user-id');

		await invalidateUserSessions(db, admin.id);

		// Admin sessions should be gone
		expect(await validateSession(db, adminSession1.id)).toEqual({ session: null, user: null });
		expect(await validateSession(db, adminSession2.id)).toEqual({ session: null, user: null });

		// Other user's session should remain active
		const otherResult = await validateSession(db, otherSession.id);
		expect(otherResult.session).toBeDefined();
		expect(otherResult.user?.id).toBe('other-user-id');

		sqlite.close();
	});
});
