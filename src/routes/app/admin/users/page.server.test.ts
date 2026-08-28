import { describe, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { initializeDatabase } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '$lib/server/auth/password';
import {
	createAdminUsersPageLoad,
	createAdminCreateUserAction
} from './admin-users-actions';

function createMockEvent(
	options: {
		user?: any;
		formData?: Record<string, string>;
	} = {}
) {
	const formData = new FormData();
	if (options.formData) {
		for (const [k, v] of Object.entries(options.formData)) {
			formData.append(k, v);
		}
	}

	const request = {
		formData: async () => formData
	} as unknown as Request;

	const event = {
		request,
		locals: {
			user: options.user ?? null,
			session: null
		}
	} as unknown as RequestEvent;

	return event;
}

describe('Admin Users Page Server Load and Actions', () => {
	describe('load', () => {
		it('redirects unauthenticated users to /app/login', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadFn = createAdminUsersPageLoad(db);
			const event = createMockEvent({ user: null });

			await expect(loadFn(event as any)).rejects.toMatchObject({
				status: 303,
				location: '/app/login'
			});

			sqlite.close();
		});

		it('rejects non-admin users with 403 Forbidden', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadFn = createAdminUsersPageLoad(db);
			const event = createMockEvent({
				user: { id: 'u-1', username: 'regular', role: 'user' }
			});

			await expect(loadFn(event as any)).rejects.toMatchObject({
				status: 403
			});

			sqlite.close();
		});

		it('loads all registered users with relevant fields ordered by creation date descending', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadFn = createAdminUsersPageLoad(db);

			// Seed admin user and two test users
			const t1 = new Date('2026-01-01T10:00:00Z');
			const t2 = new Date('2026-01-02T10:00:00Z');
			const t3 = new Date('2026-01-03T10:00:00Z');

			db.insert(schema.users)
				.values([
					{
						id: 'u-1',
						username: 'alice',
						email: 'alice@example.com',
						name: 'Alice Wonder',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash1',
						createdAt: t1
					},
					{
						id: 'u-2',
						username: 'bob',
						email: 'bob@example.com',
						name: 'Bob Builder',
						role: 'user',
						emailConfirmed: false,
						passwordHash: 'hash2',
						createdAt: t3
					},
					{
						id: 'u-3',
						username: 'charlie',
						email: 'charlie@example.com',
						name: 'Charlie Chaplin',
						role: 'user',
						emailConfirmed: true,
						passwordHash: 'hash3',
						createdAt: t2
					}
				])
				.run();

			const event = createMockEvent({
				user: { id: 'u-1', username: 'alice', role: 'admin' }
			});

			const data = await loadFn(event as any);
			expect(data).toBeDefined();
			expect(Array.isArray(data.users)).toBe(true);
			expect(data.users.length).toBe(3);

			// Check ordering: newest first (t3 -> t2 -> t1)
			expect(data.users[0].username).toBe('bob');
			expect(data.users[1].username).toBe('charlie');
			expect(data.users[2].username).toBe('alice');

			// Check user row structure
			const bob = data.users[0];
			expect(bob).toHaveProperty('id', 'u-2');
			expect(bob).toHaveProperty('username', 'bob');
			expect(bob).toHaveProperty('email', 'bob@example.com');
			expect(bob).toHaveProperty('name', 'Bob Builder');
			expect(bob).toHaveProperty('role', 'user');
			expect(bob).toHaveProperty('emailConfirmed', false);
			expect(bob).toHaveProperty('createdAt');

			// passwordHash should NOT be leaked to client
			expect(bob).not.toHaveProperty('passwordHash');

			sqlite.close();
		});
	});

	describe('actions - createUser', () => {
		it('fails with 401 when unauthenticated', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminCreateUserAction(db);
			const event = createMockEvent({
				user: null,
				formData: {
					name: 'New Typist',
					username: 'newtypist',
					email: 'typist@example.com',
					password: 'password123',
					role: 'user'
				}
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(401);

			sqlite.close();
		});

		it('fails with 403 when user is not an administrator', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminCreateUserAction(db);
			const event = createMockEvent({
				user: { id: 'u-reg', username: 'regular', role: 'user' },
				formData: {
					name: 'New Typist',
					username: 'newtypist',
					email: 'typist@example.com',
					password: 'password123',
					role: 'user'
				}
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(403);

			sqlite.close();
		});

		it('returns inline error when display name is missing or too long', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminCreateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			// Empty name
			const event1 = createMockEvent({
				user: adminUser,
				formData: {
					name: '',
					username: 'newuser',
					email: 'user@example.com',
					password: 'password123',
					role: 'user'
				}
			});
			const result1: any = await action(event1 as any);
			expect(result1?.status).toBe(400);
			expect(result1?.data?.errors?.name).toBeDefined();

			// Too long name (> 50 chars)
			const event2 = createMockEvent({
				user: adminUser,
				formData: {
					name: 'A'.repeat(51),
					username: 'newuser',
					email: 'user@example.com',
					password: 'password123',
					role: 'user'
				}
			});
			const result2: any = await action(event2 as any);
			expect(result2?.status).toBe(400);
			expect(result2?.data?.errors?.name).toBeDefined();

			sqlite.close();
		});

		it('returns inline error when username is invalid format', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminCreateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			const event = createMockEvent({
				user: adminUser,
				formData: {
					name: 'Valid Name',
					username: 'ab', // too short (<3)
					email: 'user@example.com',
					password: 'password123',
					role: 'user'
				}
			});
			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.errors?.username).toBeDefined();

			sqlite.close();
		});

		it('returns inline error on username conflict', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminCreateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			db.insert(schema.users)
				.values({
					id: 'u-existing',
					username: 'existinguser',
					email: 'existing@example.com',
					name: 'Existing User',
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: adminUser,
				formData: {
					name: 'New Typist',
					username: 'existinguser',
					email: 'new@example.com',
					password: 'password123',
					role: 'user'
				}
			});
			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.errors?.username).toMatch(/already taken/i);

			sqlite.close();
		});

		it('returns inline error on invalid email format', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminCreateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			const event = createMockEvent({
				user: adminUser,
				formData: {
					name: 'Valid Name',
					username: 'validuser',
					email: 'invalid-email',
					password: 'password123',
					role: 'user'
				}
			});
			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.errors?.email).toBeDefined();

			sqlite.close();
		});

		it('returns inline error on email conflict', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminCreateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			db.insert(schema.users)
				.values({
					id: 'u-existing',
					username: 'user1',
					email: 'taken@example.com',
					name: 'Existing User',
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: adminUser,
				formData: {
					name: 'New Typist',
					username: 'newuser',
					email: 'taken@example.com',
					password: 'password123',
					role: 'user'
				}
			});
			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.errors?.email).toMatch(/already registered/i);

			sqlite.close();
		});

		it('enforces minimum 8-character password policy for admin-created users', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminCreateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			const event = createMockEvent({
				user: adminUser,
				formData: {
					name: 'Valid Name',
					username: 'validuser',
					email: 'valid@example.com',
					password: 'short',
					role: 'user'
				}
			});
			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.errors?.password).toMatch(/at least 8 characters/i);

			// User should not have been created
			const created = db.select().from(schema.users).where(eq(schema.users.username, 'validuser')).get();
			expect(created).toBeUndefined();

			sqlite.close();
		});

		it('returns inline error when role is not admin or user', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminCreateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			const event = createMockEvent({
				user: adminUser,
				formData: {
					name: 'Valid Name',
					username: 'validuser',
					email: 'valid@example.com',
					password: 'password123',
					role: 'superadmin'
				}
			});
			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.errors?.role).toBeDefined();

			sqlite.close();
		});

		it('successfully creates user with emailConfirmed=true by default and hashed password', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminCreateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			const event = createMockEvent({
				user: adminUser,
				formData: {
					name: 'New Admin Created',
					username: 'createdbyadmin',
					email: 'admincreated@example.com',
					password: 'securePassword789!',
					role: 'admin'
				}
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);
			expect(result?.message).toBeDefined();

			const userInDb = db
				.select()
				.from(schema.users)
				.where(eq(schema.users.username, 'createdbyadmin'))
				.get();

			expect(userInDb).toBeDefined();
			expect(userInDb?.name).toBe('New Admin Created');
			expect(userInDb?.username).toBe('createdbyadmin');
			expect(userInDb?.email).toBe('admincreated@example.com');
			expect(userInDb?.role).toBe('admin');
			// Crucial requirement: Admin-created users are marked email-verified by default
			expect(userInDb?.emailConfirmed).toBe(true);
			expect(userInDb?.passwordHash).not.toBe('securePassword789!');

			const passwordValid = await verifyPassword('securePassword789!', userInDb!.passwordHash);
			expect(passwordValid).toBe(true);

			sqlite.close();
		});

		it('defaults role to user when role is omitted', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminCreateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			const event = createMockEvent({
				user: adminUser,
				formData: {
					name: 'Default Role User',
					username: 'defaultrole',
					email: 'defaultrole@example.com',
					password: 'password123'
				}
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);

			const userInDb = db
				.select()
				.from(schema.users)
				.where(eq(schema.users.username, 'defaultrole'))
				.get();

			expect(userInDb?.role).toBe('user');
			expect(userInDb?.emailConfirmed).toBe(true);

			sqlite.close();
		});
	});
});
