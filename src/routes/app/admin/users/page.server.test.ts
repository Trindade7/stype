import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { initializeDatabase } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '$lib/server/auth/password';
import { createSession, SESSION_COOKIE_NAME } from '$lib/server/auth/session';
import { validateResetToken } from '$lib/server/auth/reset-token';
import {
	createAdminUsersPageLoad,
	createAdminCreateUserAction,
	createAdminUpdateUserAction,
	createAdminResetPasswordAction,
	createAdminSendResetLinkAction,
	createAdminDeleteUserAction
} from './admin-users-actions';

function createMockEvent(
	options: {
		user?: any;
		formData?: Record<string, string>;
		url?: string;
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

	const cookies = {
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn()
	};

	const event = {
		request,
		url: new URL(options.url ?? 'http://localhost:5173/app/admin/users'),
		locals: {
			user: options.user ?? null,
			session: null
		},
		cookies
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

			expect(data).toHaveProperty('smtpConfigured');
			expect(data).toHaveProperty('pagination');
			expect(data.pagination).toEqual({
				page: 1,
				perPage: 25,
				totalCount: 3,
				totalPages: 1
			});

			sqlite.close();
		});

		it('fetches up to 25 users on page 1 with correct pagination metadata when more than 25 users exist', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadFn = createAdminUsersPageLoad(db);

			// Seed 30 users
			const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
			const usersToInsert = Array.from({ length: 30 }, (_, i) => ({
				id: `user-${i + 1}`,
				username: `user_${String(i + 1).padStart(2, '0')}`,
				email: `user${i + 1}@example.com`,
				name: `User ${i + 1}`,
				role: (i === 0 ? 'admin' : 'user') as schema.UserRole,
				emailConfirmed: true,
				passwordHash: 'hash',
				createdAt: new Date(baseTime + i * 1000)
			}));

			db.insert(schema.users).values(usersToInsert).run();

			const event = createMockEvent({
				user: { id: 'user-1', username: 'user_01', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users?page=1'
			});

			const data = await loadFn(event as any);
			expect(data.users).toHaveLength(25);
			// Newest first (user-30 is newest)
			expect(data.users[0].username).toBe('user_30');
			expect(data.users[24].username).toBe('user_06');
			expect(data.pagination).toEqual({
				page: 1,
				perPage: 25,
				totalCount: 30,
				totalPages: 2
			});

			sqlite.close();
		});

		it('clamps negative or non-numeric page search parameters to page 1 without redirects', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadFn = createAdminUsersPageLoad(db);

			// Seed 30 users
			const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
			const usersToInsert = Array.from({ length: 30 }, (_, i) => ({
				id: `user-${i + 1}`,
				username: `user_${String(i + 1).padStart(2, '0')}`,
				email: `user${i + 1}@example.com`,
				name: `User ${i + 1}`,
				role: (i === 0 ? 'admin' : 'user') as schema.UserRole,
				emailConfirmed: true,
				passwordHash: 'hash',
				createdAt: new Date(baseTime + i * 1000)
			}));
			db.insert(schema.users).values(usersToInsert).run();

			// Negative page: ?page=-5
			const eventNegative = createMockEvent({
				user: { id: 'user-1', username: 'user_01', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users?page=-5'
			});
			const dataNegative = await loadFn(eventNegative as any);
			expect(dataNegative.pagination.page).toBe(1);
			expect(dataNegative.users).toHaveLength(25);
			expect(dataNegative.users[0].username).toBe('user_30');

			// Zero page: ?page=0
			const eventZero = createMockEvent({
				user: { id: 'user-1', username: 'user_01', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users?page=0'
			});
			const dataZero = await loadFn(eventZero as any);
			expect(dataZero.pagination.page).toBe(1);
			expect(dataZero.users).toHaveLength(25);

			// Non-numeric page: ?page=invalid
			const eventInvalid = createMockEvent({
				user: { id: 'user-1', username: 'user_01', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users?page=invalid'
			});
			const dataInvalid = await loadFn(eventInvalid as any);
			expect(dataInvalid.pagination.page).toBe(1);
			expect(dataInvalid.users).toHaveLength(25);

			sqlite.close();
		});

		it('clamps oversized page numbers to totalPages without redirects and returns final slice', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadFn = createAdminUsersPageLoad(db);

			// Seed 30 users (totalPages = 2)
			const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
			const usersToInsert = Array.from({ length: 30 }, (_, i) => ({
				id: `user-${i + 1}`,
				username: `user_${String(i + 1).padStart(2, '0')}`,
				email: `user${i + 1}@example.com`,
				name: `User ${i + 1}`,
				role: (i === 0 ? 'admin' : 'user') as schema.UserRole,
				emailConfirmed: true,
				passwordHash: 'hash',
				createdAt: new Date(baseTime + i * 1000)
			}));
			db.insert(schema.users).values(usersToInsert).run();

			// Request page 99
			const eventOversized = createMockEvent({
				user: { id: 'user-1', username: 'user_01', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users?page=99'
			});
			const data = await loadFn(eventOversized as any);

			// Clamped to totalPages = 2
			expect(data.pagination.page).toBe(2);
			expect(data.pagination.totalPages).toBe(2);
			expect(data.pagination.totalCount).toBe(30);
			// 30 - 25 = 5 users on page 2
			expect(data.users).toHaveLength(5);
			// Oldest records are on page 2
			expect(data.users[0].username).toBe('user_05');
			expect(data.users[4].username).toBe('user_01');

			sqlite.close();
		});

		it('gracefully clamps to preceding page when deleting a user on the final page reduces total pages', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadFn = createAdminUsersPageLoad(db);
			const deleteAction = createAdminDeleteUserAction(db);

			// Seed 26 users (page 1 has 25, page 2 has 1 user)
			const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
			const usersToInsert = Array.from({ length: 26 }, (_, i) => ({
				id: `user-${i + 1}`,
				username: `user_${String(i + 1).padStart(2, '0')}`,
				email: `user${i + 1}@example.com`,
				name: `User ${i + 1}`,
				role: (i === 0 ? 'admin' : 'user') as schema.UserRole,
				emailConfirmed: true,
				passwordHash: 'hash',
				createdAt: new Date(baseTime + i * 1000)
			}));
			db.insert(schema.users).values(usersToInsert).run();

			// Confirm page 2 currently exists and has 1 user (user-1 is the oldest, so on page 2)
			const eventBefore = createMockEvent({
				user: { id: 'user-1', username: 'user_01', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users?page=2'
			});
			const dataBefore = await loadFn(eventBefore as any);
			expect(dataBefore.pagination.page).toBe(2);
			expect(dataBefore.pagination.totalPages).toBe(2);
			expect(dataBefore.pagination.totalCount).toBe(26);
			expect(dataBefore.users).toHaveLength(1);

			// Now delete user-26 (one of the users)
			const deleteEvent = createMockEvent({
				user: { id: 'user-1', username: 'user_01', role: 'admin' },
				formData: { id: 'user-26' }
			});
			const deleteResult: any = await deleteAction(deleteEvent as any);
			expect(deleteResult?.success).toBe(true);

			// Now reload with the same URL (?page=2)
			const eventAfter = createMockEvent({
				user: { id: 'user-1', username: 'user_01', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users?page=2'
			});
			const dataAfter = await loadFn(eventAfter as any);

			// Total pages is now 1, page request for page 2 gracefully clamped to page 1
			expect(dataAfter.pagination.page).toBe(1);
			expect(dataAfter.pagination.totalPages).toBe(1);
			expect(dataAfter.pagination.totalCount).toBe(25);
			expect(dataAfter.users).toHaveLength(25);

			sqlite.close();
		});

		it('returns smtpConfigured accurately based on SMTP configuration', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadWithSmtp = createAdminUsersPageLoad(db, { isSmtpConfigured: () => true });
			const loadWithoutSmtp = createAdminUsersPageLoad(db, { isSmtpConfigured: () => false });

			const event = createMockEvent({
				user: { id: 'u-1', username: 'admin', role: 'admin' }
			});

			const dataWith = await loadWithSmtp(event as any);
			expect(dataWith.smtpConfigured).toBe(true);

			const dataWithout = await loadWithoutSmtp(event as any);
			expect(dataWithout.smtpConfigured).toBe(false);

			sqlite.close();
		});

		it('returns empty string for search property when no search parameter is supplied', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadFn = createAdminUsersPageLoad(db);
			const event = createMockEvent({
				user: { id: 'u-1', username: 'admin', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users'
			});

			const data = await loadFn(event as any);
			expect(data).toHaveProperty('search', '');

			sqlite.close();
		});

		it('filters users matching display name, username, or email case-insensitively', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadFn = createAdminUsersPageLoad(db);

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
						createdAt: new Date('2026-01-01T10:00:00Z')
					},
					{
						id: 'u-2',
						username: 'bob',
						email: 'bob@example.com',
						name: 'Robert Builder',
						role: 'user',
						emailConfirmed: false,
						passwordHash: 'hash2',
						createdAt: new Date('2026-01-02T10:00:00Z')
					},
					{
						id: 'u-3',
						username: 'carol',
						email: 'captain@marvel.com',
						name: 'Carol Danvers',
						role: 'user',
						emailConfirmed: true,
						passwordHash: 'hash3',
						createdAt: new Date('2026-01-03T10:00:00Z')
					}
				])
				.run();

			// Match by username
			const eventUsername = createMockEvent({
				user: { id: 'u-1', username: 'alice', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users?search=alice'
			});
			const dataUsername = await loadFn(eventUsername as any);
			expect(dataUsername.search).toBe('alice');
			expect(dataUsername.users).toHaveLength(1);
			expect(dataUsername.users[0].username).toBe('alice');

			// Match by display name (case-insensitive substring)
			const eventName = createMockEvent({
				user: { id: 'u-1', username: 'alice', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users?search=builder'
			});
			const dataName = await loadFn(eventName as any);
			expect(dataName.search).toBe('builder');
			expect(dataName.users).toHaveLength(1);
			expect(dataName.users[0].username).toBe('bob');

			// Match by email domain substring
			const eventEmail = createMockEvent({
				user: { id: 'u-1', username: 'alice', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users?search=marvel'
			});
			const dataEmail = await loadFn(eventEmail as any);
			expect(dataEmail.search).toBe('marvel');
			expect(dataEmail.users).toHaveLength(1);
			expect(dataEmail.users[0].username).toBe('carol');

			sqlite.close();
		});

		it('recalculates totalCount and totalPages based on filtered dataset when search query is active', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadFn = createAdminUsersPageLoad(db);

			const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
			const usersToInsert = [
				...Array.from({ length: 30 }, (_, i) => ({
					id: `tester-${i + 1}`,
					username: `tester_${String(i + 1).padStart(2, '0')}`,
					email: `tester${i + 1}@example.com`,
					name: `QA Tester ${i + 1}`,
					role: (i === 0 ? 'admin' : 'user') as schema.UserRole,
					emailConfirmed: true,
					passwordHash: 'hash',
					createdAt: new Date(baseTime + i * 1000)
				})),
				...Array.from({ length: 30 }, (_, i) => ({
					id: `dev-${i + 1}`,
					username: `dev_${String(i + 1).padStart(2, '0')}`,
					email: `dev${i + 1}@example.com`,
					name: `Software Engineer ${i + 1}`,
					role: 'user' as schema.UserRole,
					emailConfirmed: true,
					passwordHash: 'hash',
					createdAt: new Date(baseTime + (i + 30) * 1000)
				}))
			];
			db.insert(schema.users).values(usersToInsert).run();

			// Unfiltered check
			const eventAll = createMockEvent({
				user: { id: 'tester-1', username: 'tester_01', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users'
			});
			const dataAll = await loadFn(eventAll as any);
			expect(dataAll.pagination.totalCount).toBe(60);
			expect(dataAll.pagination.totalPages).toBe(3);

			// Filtered page 1: search=tester
			const eventFilteredP1 = createMockEvent({
				user: { id: 'tester-1', username: 'tester_01', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users?page=1&search=tester'
			});
			const dataP1 = await loadFn(eventFilteredP1 as any);
			expect(dataP1.pagination.totalCount).toBe(30);
			expect(dataP1.pagination.totalPages).toBe(2);
			expect(dataP1.pagination.page).toBe(1);
			expect(dataP1.users).toHaveLength(25);
			expect(dataP1.users.every((u) => u.username.includes('tester'))).toBe(true);

			// Filtered page 2: search=tester
			const eventFilteredP2 = createMockEvent({
				user: { id: 'tester-1', username: 'tester_01', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users?page=2&search=tester'
			});
			const dataP2 = await loadFn(eventFilteredP2 as any);
			expect(dataP2.pagination.totalCount).toBe(30);
			expect(dataP2.pagination.totalPages).toBe(2);
			expect(dataP2.pagination.page).toBe(2);
			expect(dataP2.users).toHaveLength(5);
			expect(dataP2.users.every((u) => u.username.includes('tester'))).toBe(true);

			sqlite.close();
		});

		it('clamps page parameter to filtered totalPages when page exceeds filtered bounds', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadFn = createAdminUsersPageLoad(db);

			const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
			const usersToInsert = [
				...Array.from({ length: 30 }, (_, i) => ({
					id: `tester-${i + 1}`,
					username: `tester_${String(i + 1).padStart(2, '0')}`,
					email: `tester${i + 1}@example.com`,
					name: `QA Tester ${i + 1}`,
					role: (i === 0 ? 'admin' : 'user') as schema.UserRole,
					emailConfirmed: true,
					passwordHash: 'hash',
					createdAt: new Date(baseTime + i * 1000)
				}))
			];
			db.insert(schema.users).values(usersToInsert).run();

			// Requesting page 5 when filtered dataset only has 2 pages
			const event = createMockEvent({
				user: { id: 'tester-1', username: 'tester_01', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users?page=5&search=tester'
			});
			const data = await loadFn(event as any);
			expect(data.pagination.page).toBe(2);
			expect(data.pagination.totalPages).toBe(2);
			expect(data.pagination.totalCount).toBe(30);
			expect(data.users).toHaveLength(5);

			sqlite.close();
		});

		it('returns empty users array and clamps page to 1 when search query has zero matches', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const loadFn = createAdminUsersPageLoad(db);

			db.insert(schema.users)
				.values({
					id: 'admin-1',
					username: 'admin',
					email: 'admin@stype.local',
					name: 'System Admin',
					role: 'admin',
					emailConfirmed: true,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: { id: 'admin-1', username: 'admin', role: 'admin' },
				url: 'http://localhost:5173/app/admin/users?page=3&search=nonexistent'
			});
			const data = await loadFn(event as any);
			expect(data.search).toBe('nonexistent');
			expect(data.users).toEqual([]);
			expect(data.pagination).toEqual({
				page: 1,
				perPage: 25,
				totalCount: 0,
				totalPages: 1
			});

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

	describe('updateUser action', () => {
		it('rejects unauthenticated requests with 401 Unauthorized', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminUpdateUserAction(db);
			const event = createMockEvent({
				user: null,
				formData: {
					id: 'u-1',
					name: 'Updated Name',
					email: 'updated@example.com',
					role: 'user'
				}
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(401);
			expect(result?.data?.message).toBe('Unauthorized');

			sqlite.close();
		});

		it('rejects non-admin users with 403 Forbidden', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminUpdateUserAction(db);
			const event = createMockEvent({
				user: { id: 'u-regular', username: 'regular', role: 'user' },
				formData: {
					id: 'u-1',
					name: 'Updated Name',
					email: 'updated@example.com',
					role: 'user'
				}
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(403);
			expect(result?.data?.message).toBe('Forbidden');

			sqlite.close();
		});

		it('fails with 400 when user id is missing or invalid', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminUpdateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			const event = createMockEvent({
				user: adminUser,
				formData: {
					name: 'Valid Name',
					email: 'valid@example.com',
					role: 'user'
				}
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.message).toMatch(/user id/i);

			sqlite.close();
		});

		it('fails with 404 when target user does not exist', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminUpdateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			const event = createMockEvent({
				user: adminUser,
				formData: {
					id: 'non-existent-id',
					name: 'Valid Name',
					email: 'valid@example.com',
					role: 'user'
				}
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(404);
			expect(result?.data?.message).toMatch(/user not found/i);

			sqlite.close();
		});

		it('validates display name length, email format, and role', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminUpdateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			db.insert(schema.users)
				.values({
					id: 'u-target',
					username: 'target',
					email: 'target@example.com',
					name: 'Target User',
					role: 'user',
					emailConfirmed: true,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const eventEmptyName = createMockEvent({
				user: adminUser,
				formData: {
					id: 'u-target',
					name: '   ',
					email: 'target@example.com',
					role: 'user'
				}
			});
			const resultName: any = await action(eventEmptyName as any);
			expect(resultName?.status).toBe(400);
			expect(resultName?.data?.errors?.name).toMatch(/between 1 and 50/i);

			const eventInvalidEmail = createMockEvent({
				user: adminUser,
				formData: {
					id: 'u-target',
					name: 'Valid Name',
					email: 'not-an-email',
					role: 'user'
				}
			});
			const resultEmail: any = await action(eventInvalidEmail as any);
			expect(resultEmail?.status).toBe(400);
			expect(resultEmail?.data?.errors?.email).toMatch(/valid email/i);

			const eventInvalidRole = createMockEvent({
				user: adminUser,
				formData: {
					id: 'u-target',
					name: 'Valid Name',
					email: 'target@example.com',
					role: 'superuser'
				}
			});
			const resultRole: any = await action(eventInvalidRole as any);
			expect(resultRole?.status).toBe(400);
			expect(resultRole?.data?.errors?.role).toMatch(/admin or user/i);

			sqlite.close();
		});

		it('validates email uniqueness against other registered users while allowing existing email for same user', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminUpdateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			db.insert(schema.users)
				.values([
					{
						id: 'u-1',
						username: 'userone',
						email: 'userone@example.com',
						name: 'User One',
						role: 'user',
						emailConfirmed: true,
						passwordHash: 'hash1',
						createdAt: new Date()
					},
					{
						id: 'u-2',
						username: 'usertwo',
						email: 'usertwo@example.com',
						name: 'User Two',
						role: 'user',
						emailConfirmed: true,
						passwordHash: 'hash2',
						createdAt: new Date()
					}
				])
				.run();

			// Attempting to set u-1's email to u-2's email should fail
			const eventDuplicate = createMockEvent({
				user: adminUser,
				formData: {
					id: 'u-1',
					name: 'User One Renamed',
					email: 'usertwo@example.com',
					role: 'user'
				}
			});
			const resultDuplicate: any = await action(eventDuplicate as any);
			expect(resultDuplicate?.status).toBe(400);
			expect(resultDuplicate?.data?.errors?.email).toMatch(/already registered/i);

			// Updating u-1 while keeping their own email should pass email validation
			const eventSameEmail = createMockEvent({
				user: adminUser,
				formData: {
					id: 'u-1',
					name: 'User One Renamed',
					email: 'userone@example.com',
					role: 'user'
				}
			});
			const resultSame: any = await action(eventSameEmail as any);
			expect(resultSame?.status).not.toBe(400);
			expect(resultSame?.success).toBe(true);

			sqlite.close();
		});

		it('persists name and email changes and maintains verified status by default', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminUpdateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			db.insert(schema.users)
				.values({
					id: 'u-target',
					username: 'targetuser',
					email: 'old@example.com',
					name: 'Old Name',
					role: 'user',
					emailConfirmed: true,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: adminUser,
				formData: {
					id: 'u-target',
					name: 'Brand New Name',
					email: 'newemail@example.com',
					role: 'user'
				}
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);
			expect(result?.message).toBeDefined();
			expect(result?.user?.name).toBe('Brand New Name');
			expect(result?.user?.email).toBe('newemail@example.com');
			expect(result?.user?.emailConfirmed).toBe(true);

			const inDb = db.select().from(schema.users).where(eq(schema.users.id, 'u-target')).get();
			expect(inDb?.name).toBe('Brand New Name');
			expect(inDb?.email).toBe('newemail@example.com');
			expect(inDb?.emailConfirmed).toBe(true);

			sqlite.close();
		});

		it('explicitly un-verifies user when email verification toggle is unchecked', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminUpdateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			db.insert(schema.users)
				.values({
					id: 'u-target',
					username: 'targetuser',
					email: 'user@example.com',
					name: 'Target User',
					role: 'user',
					emailConfirmed: true,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: adminUser,
				formData: {
					id: 'u-target',
					name: 'Target User',
					email: 'user@example.com',
					role: 'user',
					emailConfirmed: 'false'
				}
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);
			expect(result?.user?.emailConfirmed).toBe(false);

			const inDb = db.select().from(schema.users).where(eq(schema.users.id, 'u-target')).get();
			expect(inDb?.emailConfirmed).toBe(false);

			sqlite.close();
		});

		it('explicitly verifies user when email verification toggle is checked', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminUpdateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			db.insert(schema.users)
				.values({
					id: 'u-target',
					username: 'targetuser',
					email: 'user@example.com',
					name: 'Target User',
					role: 'user',
					emailConfirmed: false,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: adminUser,
				formData: {
					id: 'u-target',
					name: 'Target User',
					email: 'user@example.com',
					role: 'user',
					emailConfirmed: 'true'
				}
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);
			expect(result?.user?.emailConfirmed).toBe(true);

			const inDb = db.select().from(schema.users).where(eq(schema.users.id, 'u-target')).get();
			expect(inDb?.emailConfirmed).toBe(true);

			sqlite.close();
		});

		it('allows promoting a user to administrator', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminUpdateUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			db.insert(schema.users)
				.values({
					id: 'u-user',
					username: 'regularuser',
					email: 'regular@example.com',
					name: 'Regular User',
					role: 'user',
					emailConfirmed: true,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: adminUser,
				formData: {
					id: 'u-user',
					name: 'Regular User',
					email: 'regular@example.com',
					role: 'admin'
				}
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);
			expect(result?.user?.role).toBe('admin');

			const inDb = db.select().from(schema.users).where(eq(schema.users.id, 'u-user')).get();
			expect(inDb?.role).toBe('admin');

			sqlite.close();
		});

		it('allows demoting an administrator to user when another administrator remains', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminUpdateUserAction(db);
			const admin1 = { id: 'admin-1', username: 'admin1', role: 'admin' };

			db.insert(schema.users)
				.values([
					{
						id: 'admin-1',
						username: 'admin1',
						email: 'admin1@example.com',
						name: 'Admin One',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash1',
						createdAt: new Date()
					},
					{
						id: 'admin-2',
						username: 'admin2',
						email: 'admin2@example.com',
						name: 'Admin Two',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash2',
						createdAt: new Date()
					}
				])
				.run();

			const event = createMockEvent({
				user: admin1,
				formData: {
					id: 'admin-2',
					name: 'Admin Two',
					email: 'admin2@example.com',
					role: 'user'
				}
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);
			expect(result?.user?.role).toBe('user');

			const inDb = db.select().from(schema.users).where(eq(schema.users.id, 'admin-2')).get();
			expect(inDb?.role).toBe('user');

			sqlite.close();
		});

		it('enforces single administrator invariant: rejects demotion of sole administrator in transaction', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminUpdateUserAction(db);
			const admin1 = { id: 'admin-sole', username: 'soleadmin', role: 'admin' };

			db.insert(schema.users)
				.values([
					{
						id: 'admin-sole',
						username: 'soleadmin',
						email: 'soleadmin@example.com',
						name: 'Sole Administrator',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash1',
						createdAt: new Date()
					},
					{
						id: 'user-regular',
						username: 'regular',
						email: 'regular@example.com',
						name: 'Regular User',
						role: 'user',
						emailConfirmed: true,
						passwordHash: 'hash2',
						createdAt: new Date()
					}
				])
				.run();

			const event = createMockEvent({
				user: admin1,
				formData: {
					id: 'admin-sole',
					name: 'Sole Administrator',
					email: 'soleadmin@example.com',
					role: 'user',
					confirmSelfDemotion: 'true'
				}
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.message).toMatch(/sole administrator|at least one administrator/i);

			// Sole administrator in database must remain admin
			const inDb = db.select().from(schema.users).where(eq(schema.users.id, 'admin-sole')).get();
			expect(inDb?.role).toBe('admin');

			sqlite.close();
		});

		it('requires explicit confirmation when an administrator demotes their own account', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminUpdateUserAction(db);
			const admin1 = { id: 'admin-1', username: 'admin1', role: 'admin' };

			db.insert(schema.users)
				.values([
					{
						id: 'admin-1',
						username: 'admin1',
						email: 'admin1@example.com',
						name: 'Admin One',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash1',
						createdAt: new Date()
					},
					{
						id: 'admin-2',
						username: 'admin2',
						email: 'admin2@example.com',
						name: 'Admin Two',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash2',
						createdAt: new Date()
					}
				])
				.run();

			// Attempting to demote self without confirmation should fail with 400
			const eventUnconfirmed = createMockEvent({
				user: admin1,
				formData: {
					id: 'admin-1',
					name: 'Admin One',
					email: 'admin1@example.com',
					role: 'user'
				}
			});

			const resultUnconfirmed: any = await action(eventUnconfirmed as any);
			expect(resultUnconfirmed?.status).toBe(400);
			expect(resultUnconfirmed?.data?.requiresConfirmation).toBe(true);
			expect(resultUnconfirmed?.data?.message).toMatch(/administrative privileges will be revoked immediately/i);

			// Account should still be admin
			let inDb = db.select().from(schema.users).where(eq(schema.users.id, 'admin-1')).get();
			expect(inDb?.role).toBe('admin');

			// Now confirming self-demotion
			const eventConfirmed = createMockEvent({
				user: admin1,
				formData: {
					id: 'admin-1',
					name: 'Admin One',
					email: 'admin1@example.com',
					role: 'user',
					confirmSelfDemotion: 'true'
				}
			});

			const resultConfirmed: any = await action(eventConfirmed as any);
			expect(resultConfirmed?.success).toBe(true);
			expect(resultConfirmed?.demotedSelf).toBe(true);
			expect(resultConfirmed?.user?.role).toBe('user');

			// Account is now user
			inDb = db.select().from(schema.users).where(eq(schema.users.id, 'admin-1')).get();
			expect(inDb?.role).toBe('user');

			sqlite.close();
		});
	});

	describe('resetPassword action', () => {
		it('fails with 401 when unauthenticated', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminResetPasswordAction(db);
			const event = createMockEvent({
				user: null,
				formData: { id: 'u-1', password: 'newpassword123' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(401);

			sqlite.close();
		});

		it('fails with 403 when caller is not an admin', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminResetPasswordAction(db);
			const event = createMockEvent({
				user: { id: 'u-1', username: 'regular', role: 'user' },
				formData: { id: 'u-2', password: 'newpassword123' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(403);

			sqlite.close();
		});

		it('fails with 400 when user ID is missing', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminResetPasswordAction(db);
			const event = createMockEvent({
				user: { id: 'admin-1', username: 'admin', role: 'admin' },
				formData: { id: '', password: 'newpassword123' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.message).toMatch(/user id is required/i);

			sqlite.close();
		});

		it('fails with 404 when target user is not found', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminResetPasswordAction(db);
			const event = createMockEvent({
				user: { id: 'admin-1', username: 'admin', role: 'admin' },
				formData: { id: 'nonexistent-id', password: 'newpassword123' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(404);
			expect(result?.data?.message).toMatch(/user not found/i);

			sqlite.close();
		});

		it('strictly enforces the minimum 8-character password length and rejects short passwords', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminResetPasswordAction(db);

			db.insert(schema.users)
				.values({
					id: 'target-1',
					username: 'targetuser',
					email: 'target@example.com',
					name: 'Target User',
					role: 'user',
					emailConfirmed: true,
					passwordHash: await hashPassword('initialpassword1'),
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: { id: 'admin-1', username: 'admin', role: 'admin' },
				formData: { id: 'target-1', password: 'short' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.errors?.password).toBe('Password must be at least 8 characters');

			// Password hash should not be changed
			const userInDb = db.select().from(schema.users).where(eq(schema.users.id, 'target-1')).get();
			const matchesOld = await verifyPassword('initialpassword1', userInDb!.passwordHash);
			expect(matchesOld).toBe(true);

			sqlite.close();
		});

		it('updates user password hash and enables login with new password while invalidating old password', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminResetPasswordAction(db);

			db.insert(schema.users)
				.values({
					id: 'target-1',
					username: 'targetuser',
					email: 'target@example.com',
					name: 'Target User',
					role: 'user',
					emailConfirmed: true,
					passwordHash: await hashPassword('oldpassword123'),
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: { id: 'admin-1', username: 'admin', role: 'admin' },
				formData: { id: 'target-1', password: 'brandNewPassword456' }
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);
			expect(result?.action).toBe('resetPassword');
			expect(result?.message).toMatch(/password reset successfully/i);

			const userInDb = db.select().from(schema.users).where(eq(schema.users.id, 'target-1')).get();
			expect(userInDb).toBeDefined();

			// Old password must fail
			const oldValid = await verifyPassword('oldpassword123', userInDb!.passwordHash);
			expect(oldValid).toBe(false);

			// New password must verify successfully
			const newValid = await verifyPassword('brandNewPassword456', userInDb!.passwordHash);
			expect(newValid).toBe(true);

			sqlite.close();
		});

		it('immediately terminates all active sessions for targeted user while preserving other users sessions', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminResetPasswordAction(db);

			db.insert(schema.users)
				.values([
					{
						id: 'admin-1',
						username: 'admin',
						email: 'admin@example.com',
						name: 'Admin',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: await hashPassword('adminpassword1'),
						createdAt: new Date()
					},
					{
						id: 'target-1',
						username: 'targetuser',
						email: 'target@example.com',
						name: 'Target',
						role: 'user',
						emailConfirmed: true,
						passwordHash: await hashPassword('targetpass1'),
						createdAt: new Date()
					},
					{
						id: 'other-1',
						username: 'otheruser',
						email: 'other@example.com',
						name: 'Other',
						role: 'user',
						emailConfirmed: true,
						passwordHash: await hashPassword('otherpass1'),
						createdAt: new Date()
					}
				])
				.run();

			// Create 2 active sessions for target user, 1 for other user, 1 for admin
			const targetSession1 = await createSession(db, 'target-1');
			const targetSession2 = await createSession(db, 'target-1');
			const otherSession = await createSession(db, 'other-1');
			const adminSession = await createSession(db, 'admin-1');

			const allSessionsBefore = db.select().from(schema.sessions).all();
			expect(allSessionsBefore.length).toBe(4);

			const event = createMockEvent({
				user: { id: 'admin-1', username: 'admin', role: 'admin' },
				formData: { id: 'target-1', password: 'newTargetPassword88' }
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);

			// Target user's sessions must be gone
			const targetSessionsAfter = db
				.select()
				.from(schema.sessions)
				.where(eq(schema.sessions.userId, 'target-1'))
				.all();
			expect(targetSessionsAfter.length).toBe(0);

			// Other user and admin sessions must remain intact
			const otherSessionInDb = db
				.select()
				.from(schema.sessions)
				.where(eq(schema.sessions.id, otherSession.id))
				.get();
			expect(otherSessionInDb).toBeDefined();

			const adminSessionInDb = db
				.select()
				.from(schema.sessions)
				.where(eq(schema.sessions.id, adminSession.id))
				.get();
			expect(adminSessionInDb).toBeDefined();

			sqlite.close();
		});

		it('flags resetSelf when administrator directly resets their own password and terminates their session', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminResetPasswordAction(db);

			db.insert(schema.users)
				.values({
					id: 'admin-1',
					username: 'admin',
					email: 'admin@example.com',
					name: 'Admin',
					role: 'admin',
					emailConfirmed: true,
					passwordHash: await hashPassword('adminoldpassword1'),
					createdAt: new Date()
				})
				.run();

			const session = await createSession(db, 'admin-1');

			const event = createMockEvent({
				user: { id: 'admin-1', username: 'admin', role: 'admin' },
				formData: { id: 'admin-1', password: 'newAdminPassword99' }
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);
			expect(result?.resetSelf).toBe(true);
			expect(event.cookies.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME, { path: '/' });

			// Active session must be deleted
			const sessionInDb = db
				.select()
				.from(schema.sessions)
				.where(eq(schema.sessions.id, session.id))
				.get();
			expect(sessionInDb).toBeUndefined();

			sqlite.close();
		});
	});

	describe('sendResetLink action', () => {
		it('fails with 401 when unauthenticated', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminSendResetLinkAction(db, { isSmtpConfigured: () => true });
			const event = createMockEvent({
				user: null,
				formData: { id: 'u-1' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(401);

			sqlite.close();
		});

		it('fails with 403 when caller is not an admin', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminSendResetLinkAction(db, { isSmtpConfigured: () => true });
			const event = createMockEvent({
				user: { id: 'u-1', username: 'regular', role: 'user' },
				formData: { id: 'u-2' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(403);

			sqlite.close();
		});

		it('fails with 400 when user ID is missing', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminSendResetLinkAction(db, { isSmtpConfigured: () => true });
			const event = createMockEvent({
				user: { id: 'admin-1', username: 'admin', role: 'admin' },
				formData: { id: '' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.message).toMatch(/user id is required/i);

			sqlite.close();
		});

		it('fails with 404 when target user is not found', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminSendResetLinkAction(db, { isSmtpConfigured: () => true });
			const event = createMockEvent({
				user: { id: 'admin-1', username: 'admin', role: 'admin' },
				formData: { id: 'nonexistent-user' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(404);
			expect(result?.data?.message).toMatch(/user not found/i);

			sqlite.close();
		});

		it('fails with 400 when SMTP is not configured', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminSendResetLinkAction(db, { isSmtpConfigured: () => false });

			db.insert(schema.users)
				.values({
					id: 'target-1',
					username: 'targetuser',
					email: 'target@example.com',
					name: 'Target User',
					role: 'user',
					emailConfirmed: true,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: { id: 'admin-1', username: 'admin', role: 'admin' },
				formData: { id: 'target-1' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.message).toMatch(/smtp is not configured/i);

			sqlite.close();
		});

		it('fails with 400 when target user has an unverified email', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminSendResetLinkAction(db, { isSmtpConfigured: () => true });

			db.insert(schema.users)
				.values({
					id: 'target-unverified',
					username: 'unverified',
					email: 'unverified@example.com',
					name: 'Unverified User',
					role: 'user',
					emailConfirmed: false,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			const event = createMockEvent({
				user: { id: 'admin-1', username: 'admin', role: 'admin' },
				formData: { id: 'target-unverified' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.message).toMatch(/unverified/i);

			sqlite.close();
		});

		it('creates time-limited reset token, delivers email with reset link, and preserves active sessions intact', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			let sentEmailOptions: any = null;

			const mockSendEmail = async (opts: any) => {
				sentEmailOptions = opts;
				return { delivered: true, mode: 'smtp' as const };
			};

			const action = createAdminSendResetLinkAction(db, {
				isSmtpConfigured: () => true,
				sendEmail: mockSendEmail as any
			});

			db.insert(schema.users)
				.values({
					id: 'target-1',
					username: 'targetuser',
					email: 'target@example.com',
					name: 'Target User',
					role: 'user',
					emailConfirmed: true,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			// Target user has an active session before sending reset link
			const targetSession = await createSession(db, 'target-1');

			const event = createMockEvent({
				user: { id: 'admin-1', username: 'admin', role: 'admin' },
				formData: { id: 'target-1' }
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);
			expect(result?.action).toBe('sendResetLink');
			expect(result?.message).toMatch(/password reset link sent successfully/i);

			// Check email delivery was dispatched
			expect(sentEmailOptions).toBeDefined();
			expect(sentEmailOptions.to).toBe('target@example.com');
			expect(sentEmailOptions.username).toBe('targetuser');
			expect(sentEmailOptions.resetUrl).toMatch(/http:\/\/localhost:5173\/app\/reset-password\?token=[a-f0-9]{64}/);

			// Extract token from URL and verify it exists and is valid in DB
			const tokenMatch = sentEmailOptions.resetUrl.match(/token=([a-f0-9]+)/);
			expect(tokenMatch).not.toBeNull();
			const token = tokenMatch[1];

			const validation = await validateResetToken(db, token);
			expect(validation.tokenRecord).toBeDefined();
			expect(validation.user?.id).toBe('target-1');

			// Sessions must remain intact! (Tokens are unredeemed)
			const sessionInDb = db
				.select()
				.from(schema.sessions)
				.where(eq(schema.sessions.id, targetSession.id))
				.get();
			expect(sessionInDb).toBeDefined();

			sqlite.close();
		});
	});

	describe('deleteUser action', () => {
		it('rejects unauthenticated requests with 401 Unauthorized', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminDeleteUserAction(db);
			const event = createMockEvent({ user: null, formData: { id: 'some-id' } });

			const result: any = await action(event as any);
			expect(result?.status).toBe(401);
			expect(result?.data?.action).toBe('deleteUser');
			expect(result?.data?.message).toMatch(/unauthorized/i);

			sqlite.close();
		});

		it('rejects non-admin users with 403 Forbidden', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminDeleteUserAction(db);
			const event = createMockEvent({
				user: { id: 'u-1', username: 'regular', role: 'user' },
				formData: { id: 'some-id' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(403);
			expect(result?.data?.action).toBe('deleteUser');
			expect(result?.data?.message).toMatch(/forbidden/i);

			sqlite.close();
		});

		it('rejects with 400 Bad Request when user ID is missing', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminDeleteUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			const event = createMockEvent({
				user: adminUser,
				formData: {}
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.action).toBe('deleteUser');
			expect(result?.data?.message).toMatch(/user id is required/i);

			sqlite.close();
		});

		it('returns 404 when target user does not exist', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminDeleteUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			const event = createMockEvent({
				user: adminUser,
				formData: { id: 'non-existent-user' }
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(404);
			expect(result?.data?.action).toBe('deleteUser');
			expect(result?.data?.message).toMatch(/user not found/i);

			sqlite.close();
		});

		it('deletes a user and cleanly cascades deletion to sessions, custom passages, test runs, settings, and tokens', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminDeleteUserAction(db);
			const adminUser = { id: 'admin-1', username: 'admin', role: 'admin' };

			// Insert admin user
			db.insert(schema.users)
				.values({
					id: 'admin-1',
					username: 'admin',
					email: 'admin@example.com',
					role: 'admin',
					emailConfirmed: true,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			// Insert deletee user
			db.insert(schema.users)
				.values({
					id: 'u-deletee',
					username: 'deletee',
					email: 'deletee@example.com',
					role: 'user',
					emailConfirmed: true,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			// Insert other user
			db.insert(schema.users)
				.values({
					id: 'u-other',
					username: 'other',
					email: 'other@example.com',
					role: 'user',
					emailConfirmed: true,
					passwordHash: 'hash',
					createdAt: new Date()
				})
				.run();

			// Sessions
			await createSession(db, 'u-deletee');
			const otherSession = await createSession(db, 'u-other');

			// Custom passages
			const [deleteePassage] = db
				.insert(schema.passages)
				.values({
					text: 'Deletee passage text',
					userId: 'u-deletee',
					createdAt: new Date()
				})
				.returning()
				.all();

			const [otherPassage] = db
				.insert(schema.passages)
				.values({
					text: 'Other passage text',
					userId: 'u-other',
					createdAt: new Date()
				})
				.returning()
				.all();

			// Test runs
			db.insert(schema.testRuns)
				.values([
					{
						userId: 'u-deletee',
						passageId: deleteePassage.id,
						wpm: 80,
						accuracy: 95,
						timeElapsed: 20,
						correctChars: 100,
						incorrectChars: 5,
						extraChars: 0,
						missedChars: 0,
						createdAt: new Date()
					},
					{
						userId: 'u-other',
						passageId: otherPassage.id,
						wpm: 90,
						accuracy: 98,
						timeElapsed: 15,
						correctChars: 120,
						incorrectChars: 2,
						extraChars: 0,
						missedChars: 0,
						createdAt: new Date()
					}
				])
				.run();

			// Settings
			db.insert(schema.userSettings)
				.values([
					{
						userId: 'u-deletee',
						mode: 'passage',
						duration: 30,
						theme: 'dark',
						createdAt: new Date(),
						updatedAt: new Date()
					},
					{
						userId: 'u-other',
						mode: 'timed',
						duration: 60,
						theme: 'light',
						createdAt: new Date(),
						updatedAt: new Date()
					}
				])
				.run();

			// Password reset tokens
			db.insert(schema.passwordResetTokens)
				.values([
					{
						id: 'reset-deletee',
						userId: 'u-deletee',
						tokenHash: 'hash-deletee',
						expiresAt: new Date(Date.now() + 3600000),
						createdAt: new Date()
					},
					{
						id: 'reset-other',
						userId: 'u-other',
						tokenHash: 'hash-other',
						expiresAt: new Date(Date.now() + 3600000),
						createdAt: new Date()
					}
				])
				.run();

			// Email confirmation tokens
			db.insert(schema.emailConfirmationTokens)
				.values([
					{
						id: 'email-deletee',
						userId: 'u-deletee',
						tokenHash: 'email-hash-deletee',
						expiresAt: new Date(Date.now() + 3600000),
						createdAt: new Date()
					},
					{
						id: 'email-other',
						userId: 'u-other',
						tokenHash: 'email-hash-other',
						expiresAt: new Date(Date.now() + 3600000),
						createdAt: new Date()
					}
				])
				.run();

			// Execute deleteUser action for u-deletee
			const event = createMockEvent({
				user: adminUser,
				formData: { id: 'u-deletee' }
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);
			expect(result?.action).toBe('deleteUser');
			expect(result?.message).toMatch(/user deleted successfully/i);

			// Verify u-deletee is gone from users table
			const deletedUserInDb = db
				.select()
				.from(schema.users)
				.where(eq(schema.users.id, 'u-deletee'))
				.get();
			expect(deletedUserInDb).toBeUndefined();

			// Verify sessions cascaded
			const deleteeSessions = db
				.select()
				.from(schema.sessions)
				.where(eq(schema.sessions.userId, 'u-deletee'))
				.all();
			expect(deleteeSessions).toHaveLength(0);

			// Verify passages cascaded
			const deleteePassages = db
				.select()
				.from(schema.passages)
				.where(eq(schema.passages.userId, 'u-deletee'))
				.all();
			expect(deleteePassages).toHaveLength(0);

			// Verify test runs cascaded
			const deleteeTestRuns = db
				.select()
				.from(schema.testRuns)
				.where(eq(schema.testRuns.userId, 'u-deletee'))
				.all();
			expect(deleteeTestRuns).toHaveLength(0);

			// Verify user settings cascaded
			const deleteeSettings = db
				.select()
				.from(schema.userSettings)
				.where(eq(schema.userSettings.userId, 'u-deletee'))
				.get();
			expect(deleteeSettings).toBeUndefined();

			// Verify password reset tokens cascaded
			const deleteeResetTokens = db
				.select()
				.from(schema.passwordResetTokens)
				.where(eq(schema.passwordResetTokens.userId, 'u-deletee'))
				.all();
			expect(deleteeResetTokens).toHaveLength(0);

			// Verify email confirmation tokens cascaded
			const deleteeEmailTokens = db
				.select()
				.from(schema.emailConfirmationTokens)
				.where(eq(schema.emailConfirmationTokens.userId, 'u-deletee'))
				.all();
			expect(deleteeEmailTokens).toHaveLength(0);

			// Verify other user and their records remain intact
			const otherUserInDb = db
				.select()
				.from(schema.users)
				.where(eq(schema.users.id, 'u-other'))
				.get();
			expect(otherUserInDb).toBeDefined();

			const otherSessions = db
				.select()
				.from(schema.sessions)
				.where(eq(schema.sessions.userId, 'u-other'))
				.all();
			expect(otherSessions).toHaveLength(1);

			const otherPassages = db
				.select()
				.from(schema.passages)
				.where(eq(schema.passages.userId, 'u-other'))
				.all();
			expect(otherPassages).toHaveLength(1);

			const otherTestRuns = db
				.select()
				.from(schema.testRuns)
				.where(eq(schema.testRuns.userId, 'u-other'))
				.all();
			expect(otherTestRuns).toHaveLength(1);

			const otherSettings = db
				.select()
				.from(schema.userSettings)
				.where(eq(schema.userSettings.userId, 'u-other'))
				.get();
			expect(otherSettings).toBeDefined();

			const otherResetTokens = db
				.select()
				.from(schema.passwordResetTokens)
				.where(eq(schema.passwordResetTokens.userId, 'u-other'))
				.all();
			expect(otherResetTokens).toHaveLength(1);

			const otherEmailTokens = db
				.select()
				.from(schema.emailConfirmationTokens)
				.where(eq(schema.emailConfirmationTokens.userId, 'u-other'))
				.all();
			expect(otherEmailTokens).toHaveLength(1);

			sqlite.close();
		});

		it('allows deleting an administrator when another administrator remains', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminDeleteUserAction(db);
			const admin1 = { id: 'admin-1', username: 'admin1', role: 'admin' };

			db.insert(schema.users)
				.values([
					{
						id: 'admin-1',
						username: 'admin1',
						email: 'admin1@example.com',
						name: 'Admin One',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash1',
						createdAt: new Date()
					},
					{
						id: 'admin-2',
						username: 'admin2',
						email: 'admin2@example.com',
						name: 'Admin Two',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash2',
						createdAt: new Date()
					}
				])
				.run();

			const event = createMockEvent({
				user: admin1,
				formData: { id: 'admin-2' }
			});

			const result: any = await action(event as any);
			expect(result?.success).toBe(true);
			expect(result?.action).toBe('deleteUser');

			const inDb = db
				.select()
				.from(schema.users)
				.where(eq(schema.users.id, 'admin-2'))
				.get();
			expect(inDb).toBeUndefined();

			const remainingAdmins = db
				.select()
				.from(schema.users)
				.where(eq(schema.users.role, 'admin'))
				.all();
			expect(remainingAdmins).toHaveLength(1);
			expect(remainingAdmins[0].id).toBe('admin-1');

			sqlite.close();
		});

		it('enforces single administrator invariant: rejects deletion of sole administrator in transaction', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminDeleteUserAction(db);
			const admin1 = { id: 'admin-sole', username: 'soleadmin', role: 'admin' };

			db.insert(schema.users)
				.values([
					{
						id: 'admin-sole',
						username: 'soleadmin',
						email: 'soleadmin@example.com',
						name: 'Sole Administrator',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash1',
						createdAt: new Date()
					},
					{
						id: 'user-regular',
						username: 'regular',
						email: 'regular@example.com',
						name: 'Regular User',
						role: 'user',
						emailConfirmed: true,
						passwordHash: 'hash2',
						createdAt: new Date()
					}
				])
				.run();

			const event = createMockEvent({
				user: admin1,
				formData: {
					id: 'admin-sole',
					confirmSelfDelete: 'true'
				}
			});

			const result: any = await action(event as any);
			expect(result?.status).toBe(400);
			expect(result?.data?.action).toBe('deleteUser');
			expect(result?.data?.message).toMatch(/sole administrator|at least one administrator/i);

			// Sole administrator must remain in the database intact
			const inDb = db
				.select()
				.from(schema.users)
				.where(eq(schema.users.id, 'admin-sole'))
				.get();
			expect(inDb).toBeDefined();
			expect(inDb?.role).toBe('admin');

			sqlite.close();
		});

		it('resilient against race conditions: concurrent deletion of administrators guarantees at least one administrator remains', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminDeleteUserAction(db);

			db.insert(schema.users)
				.values([
					{
						id: 'admin-1',
						username: 'admin1',
						email: 'admin1@example.com',
						name: 'Admin One',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash1',
						createdAt: new Date()
					},
					{
						id: 'admin-2',
						username: 'admin2',
						email: 'admin2@example.com',
						name: 'Admin Two',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash2',
						createdAt: new Date()
					}
				])
				.run();

			// Admin 1 attempts to delete Admin 2, while Admin 2 attempts to delete Admin 1
			const event1 = createMockEvent({
				user: { id: 'admin-1', username: 'admin1', role: 'admin' },
				formData: { id: 'admin-2' }
			});
			const event2 = createMockEvent({
				user: { id: 'admin-2', username: 'admin2', role: 'admin' },
				formData: { id: 'admin-1' }
			});

			// Execute both actions concurrently
			const [result1, result2] = await Promise.all([
				action(event1 as any) as any,
				action(event2 as any) as any
			]);

			const results = [result1, result2];
			const successCount = results.filter((r) => r?.success === true).length;
			const failedCount = results.filter((r) => r?.status === 400).length;

			// Exactly one must succeed and one must fail due to sole-admin invariant
			expect(successCount).toBe(1);
			expect(failedCount).toBe(1);

			// Check database state: exactly one administrator must remain
			const remainingAdmins = db
				.select()
				.from(schema.users)
				.where(eq(schema.users.role, 'admin'))
				.all();
			expect(remainingAdmins).toHaveLength(1);

			sqlite.close();
		});

		it('requires explicit confirmation when an administrator deletes their own account', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminDeleteUserAction(db);
			const admin1 = { id: 'admin-1', username: 'admin1', role: 'admin' };

			db.insert(schema.users)
				.values([
					{
						id: 'admin-1',
						username: 'admin1',
						email: 'admin1@example.com',
						name: 'Admin One',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash1',
						createdAt: new Date()
					},
					{
						id: 'admin-2',
						username: 'admin2',
						email: 'admin2@example.com',
						name: 'Admin Two',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash2',
						createdAt: new Date()
					}
				])
				.run();

			// Attempting self-deletion without confirmSelfDelete: 'true'
			const eventUnconfirmed = createMockEvent({
				user: admin1,
				formData: {
					id: 'admin-1'
				}
			});

			const resultUnconfirmed: any = await action(eventUnconfirmed as any);
			expect(resultUnconfirmed?.status).toBe(400);
			expect(resultUnconfirmed?.data?.action).toBe('deleteUser');
			expect(resultUnconfirmed?.data?.requiresConfirmation).toBe(true);
			expect(resultUnconfirmed?.data?.message).toMatch(/session will terminate immediately/i);

			// Account must remain intact in DB
			const inDb = db
				.select()
				.from(schema.users)
				.where(eq(schema.users.id, 'admin-1'))
				.get();
			expect(inDb).toBeDefined();

			sqlite.close();
		});

		it('deletes user record, terminates session, clears session cookie, and redirects to /app/login on confirmed self-deletion', async () => {
			const { db, sqlite } = initializeDatabase(':memory:');
			const action = createAdminDeleteUserAction(db);
			const admin1 = { id: 'admin-1', username: 'admin1', role: 'admin' };

			db.insert(schema.users)
				.values([
					{
						id: 'admin-1',
						username: 'admin1',
						email: 'admin1@example.com',
						name: 'Admin One',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash1',
						createdAt: new Date()
					},
					{
						id: 'admin-2',
						username: 'admin2',
						email: 'admin2@example.com',
						name: 'Admin Two',
						role: 'admin',
						emailConfirmed: true,
						passwordHash: 'hash2',
						createdAt: new Date()
					}
				])
				.run();

			const activeSession = await createSession(db, 'admin-1');

			const event = createMockEvent({
				user: admin1,
				formData: {
					id: 'admin-1',
					confirmSelfDelete: 'true'
				}
			});
			(event.locals as any).session = activeSession;

			await expect(action(event as any)).rejects.toMatchObject({
				status: 303,
				location: '/app/login'
			});

			// Account must be deleted from DB
			const inDb = db
				.select()
				.from(schema.users)
				.where(eq(schema.users.id, 'admin-1'))
				.get();
			expect(inDb).toBeUndefined();

			// Session must be removed
			const sessionsInDb = db
				.select()
				.from(schema.sessions)
				.where(eq(schema.sessions.userId, 'admin-1'))
				.all();
			expect(sessionsInDb).toHaveLength(0);

			// Session cookie must be deleted
			expect(event.cookies.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME, { path: '/' });

			// Locals must be cleared
			expect(event.locals.user).toBeNull();
			expect(event.locals.session).toBeNull();

			sqlite.close();
		});
	});
});
