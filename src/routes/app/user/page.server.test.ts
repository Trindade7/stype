import { describe, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { initializeDatabase } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '$lib/server/auth/password';
import { createLoginAction } from '../login/auth-actions';
import {
	createUserPageLoad,
	createUpdateDetailsAction,
	createUpdatePasswordAction
} from './user-actions';

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

describe('User Page Server Load and Actions', () => {
	describe('load', () => {
		it('redirects unauthenticated users to /app/login', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadFn = createUserPageLoad(db);
			const event = createMockEvent({ user: null });

			await expect(loadFn(event as any)).rejects.toMatchObject({
				status: 303,
				location: '/app/login'
			});

			sqlite.close();
		});

		it('loads user data for authenticated user', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadFn = createUserPageLoad(db);

			const userId = 'user-123';
			db.insert(schema.users)
				.values({
					id: userId,
					username: 'testtypist',
					email: 'test@example.com',
					name: 'Test Typist',
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: { id: userId, username: 'testtypist' }
			});

			const data = await loadFn(event as any);
			expect(data).toBeDefined();
			expect(data.user).toBeDefined();
			expect(data.user.id).toBe(userId);
			expect(data.user.username).toBe('testtypist');
			expect(data.user.email).toBe('test@example.com');
			expect(data.user.name).toBe('Test Typist');

			sqlite.close();
		});
	});

	describe('actions - updateDetails', () => {
		it('fails with 401 when unauthenticated', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createUpdateDetailsAction(db);
			const event = createMockEvent({
				user: null,
				formData: { name: 'New Name', email: 'new@example.com' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(401);

			sqlite.close();
		});

		it('fails with 400 when display name is empty or whitespace', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createUpdateDetailsAction(db);
			const event = createMockEvent({
				user: { id: 'u1', username: 'u1' },
				formData: { name: '   ', email: 'valid@example.com' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.message).toMatch(/display name.*between 1 and 50/i);

			sqlite.close();
		});

		it('fails with 400 when display name exceeds 50 characters', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createUpdateDetailsAction(db);
			const event = createMockEvent({
				user: { id: 'u1', username: 'u1' },
				formData: { name: 'a'.repeat(51), email: 'valid@example.com' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.message).toMatch(/display name.*between 1 and 50/i);

			sqlite.close();
		});

		it('fails with 400 when email format is invalid', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createUpdateDetailsAction(db);
			const event = createMockEvent({
				user: { id: 'u1', username: 'u1' },
				formData: { name: 'Valid Name', email: 'not-an-email' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.message).toMatch(/valid email/i);

			sqlite.close();
		});

		it('fails with 400 when email belongs to another user', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createUpdateDetailsAction(db);

			db.insert(schema.users)
				.values({
					id: 'u1',
					username: 'user1',
					email: 'taken@example.com',
					name: 'User One',
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			db.insert(schema.users)
				.values({
					id: 'u2',
					username: 'user2',
					email: 'user2@example.com',
					name: 'User Two',
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: { id: 'u2', username: 'user2', email: 'user2@example.com' },
				formData: { name: 'User Two', email: 'taken@example.com' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.message).toMatch(/email.*already (registered|in use|taken)/i);

			sqlite.close();
		});

		it('succeeds and updates database when user updates name keeping their own email', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createUpdateDetailsAction(db);

			db.insert(schema.users)
				.values({
					id: 'u1',
					username: 'user1',
					email: 'myemail@example.com',
					name: 'Original Name',
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: { id: 'u1', username: 'user1', email: 'myemail@example.com' },
				formData: { name: 'Updated Name', email: 'myemail@example.com' }
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);

			const userInDb = db.select().from(schema.users).where(eq(schema.users.id, 'u1')).get();
			expect(userInDb?.name).toBe('Updated Name');
			expect(userInDb?.email).toBe('myemail@example.com');

			sqlite.close();
		});

		it('persists updated name and new unused email to database', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createUpdateDetailsAction(db);

			db.insert(schema.users)
				.values({
					id: 'u1',
					username: 'user1',
					email: 'old@example.com',
					name: 'Old Name',
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: { id: 'u1', username: 'user1', email: 'old@example.com' },
				formData: { name: 'New Shiny Name', email: 'newemail@example.com' }
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);
			expect(result?.message).toMatch(/updated/i);

			const userInDb = db.select().from(schema.users).where(eq(schema.users.id, 'u1')).get();
			expect(userInDb?.name).toBe('New Shiny Name');
			expect(userInDb?.email).toBe('newemail@example.com');

			sqlite.close();
		});
	});

	describe('actions - updatePassword', () => {
		it('fails with 401 when unauthenticated', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createUpdatePasswordAction(db);
			const event = createMockEvent({
				user: null,
				formData: {
					currentPassword: 'oldpassword123',
					newPassword: 'newpassword123',
					confirmPassword: 'newpassword123'
				}
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(401);

			sqlite.close();
		});

		it('fails with 400 when current password is incorrect', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createUpdatePasswordAction(db);
			const passwordHash = await hashPassword('correctpassword123');

			db.insert(schema.users)
				.values({
					id: 'u1',
					username: 'user1',
					email: 'user1@example.com',
					name: 'User One',
					passwordHash,
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: { id: 'u1', username: 'user1' },
				formData: {
					currentPassword: 'wrongpassword',
					newPassword: 'newpassword123',
					confirmPassword: 'newpassword123'
				}
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.message).toMatch(/current password.*incorrect/i);

			sqlite.close();
		});

		it('fails with 400 when new password is fewer than 8 characters', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createUpdatePasswordAction(db);
			const passwordHash = await hashPassword('correctpassword123');

			db.insert(schema.users)
				.values({
					id: 'u1',
					username: 'user1',
					email: 'user1@example.com',
					name: 'User One',
					passwordHash,
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: { id: 'u1', username: 'user1' },
				formData: {
					currentPassword: 'correctpassword123',
					newPassword: 'short',
					confirmPassword: 'short'
				}
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.message).toMatch(/new password.*at least 8 characters/i);

			sqlite.close();
		});

		it('fails with 400 when new password and confirmation do not match', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createUpdatePasswordAction(db);
			const passwordHash = await hashPassword('correctpassword123');

			db.insert(schema.users)
				.values({
					id: 'u1',
					username: 'user1',
					email: 'user1@example.com',
					name: 'User One',
					passwordHash,
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: { id: 'u1', username: 'user1' },
				formData: {
					currentPassword: 'correctpassword123',
					newPassword: 'newpassword123',
					confirmPassword: 'mismatchedpassword123'
				}
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.message).toMatch(/do not match/i);

			sqlite.close();
		});

		it('successfully updates password hash in database when valid', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createUpdatePasswordAction(db);
			const oldPasswordHash = await hashPassword('oldpassword123');

			db.insert(schema.users)
				.values({
					id: 'u1',
					username: 'user1',
					email: 'user1@example.com',
					name: 'User One',
					passwordHash: oldPasswordHash,
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: { id: 'u1', username: 'user1' },
				formData: {
					currentPassword: 'oldpassword123',
					newPassword: 'brandnewpassword123',
					confirmPassword: 'brandnewpassword123'
				}
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);
			expect(result?.message).toMatch(/password updated successfully/i);

			const userInDb = db.select().from(schema.users).where(eq(schema.users.id, 'u1')).get();
			expect(userInDb?.passwordHash).not.toBe(oldPasswordHash);

			// Verify that the new password verifies against stored hash
			const isValidNew = await verifyPassword('brandnewpassword123', userInDb!.passwordHash);
			expect(isValidNew).toBe(true);

			// Verify old password fails
			const isOldValid = await verifyPassword('oldpassword123', userInDb!.passwordHash);
			expect(isOldValid).toBe(false);

			sqlite.close();
		});

		it('causes subsequent login attempts to fail with old password and succeed with new password', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const updatePasswordAction = createUpdatePasswordAction(db);
			const loginAction = createLoginAction(db);
			const oldPasswordHash = await hashPassword('initialPassword123');

			db.insert(schema.users)
				.values({
					id: 'u-rotate',
					username: 'rotator',
					email: 'rotator@example.com',
					name: 'Rotator User',
					passwordHash: oldPasswordHash,
					createdAt: new Date()
				})
				.run();

			// 1. Rotate password
			const updateEvent = createMockEvent({
				user: { id: 'u-rotate', username: 'rotator' },
				formData: {
					currentPassword: 'initialPassword123',
					newPassword: 'rotatedPassword456',
					confirmPassword: 'rotatedPassword456'
				}
			});

			const updateResult: any = await updatePasswordAction(updateEvent as any);
			expect(updateResult?.success).toBe(true);

			// 2. Attempt login with old password -> should fail
			const failLoginEvent = {
				request: {
					formData: async () => {
						const fd = new FormData();
						fd.append('username', 'rotator');
						fd.append('password', 'initialPassword123');
						return fd;
					}
				},
				cookies: { set: () => {}, get: () => undefined, delete: () => {} },
				locals: { session: null, user: null }
			};
			const failLoginResult: any = await loginAction(failLoginEvent as any);
			expect(failLoginResult?.status).toBe(400);

			// 3. Attempt login with new password -> should succeed (redirects 303 to /app)
			const successLoginEvent = {
				request: {
					formData: async () => {
						const fd = new FormData();
						fd.append('username', 'rotator');
						fd.append('password', 'rotatedPassword456');
						return fd;
					}
				},
				cookies: { set: () => {}, get: () => undefined, delete: () => {} },
				locals: { session: null, user: null }
			};
			await expect(loginAction(successLoginEvent as any)).rejects.toMatchObject({
				status: 303,
				location: '/app'
			});

			sqlite.close();
		});
	});
});
