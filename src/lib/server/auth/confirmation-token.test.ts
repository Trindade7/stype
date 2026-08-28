import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { initializeDatabase } from '../db';
import * as schema from '../db/schema';
import {
	generateConfirmationToken,
	hashConfirmationToken,
	createEmailConfirmationToken,
	validateConfirmationToken,
	invalidateConfirmationToken,
	invalidateUserConfirmationTokens,
	CONFIRMATION_TOKEN_EXPIRATION_MS
} from './confirmation-token';

describe('Email Confirmation Token Management', () => {
	function setupTestUser(
		db: any,
		id = 'user-confirm-test-1',
		username = 'confirmtypist',
		email = 'confirm@example.com'
	) {
		db.insert(schema.users)
			.values({
				id,
				username,
				email,
				role: 'user',
				emailConfirmed: false,
				passwordHash: 'dummyhash',
				createdAt: new Date()
			})
			.run();
	}

	it('generates high-entropy confirmation token and deterministic SHA-256 hash', () => {
		const token1 = generateConfirmationToken();
		const token2 = generateConfirmationToken();

		expect(token1).toBeTruthy();
		expect(token2).toBeTruthy();
		expect(token1).not.toBe(token2);
		expect(token1.length).toBeGreaterThanOrEqual(32);

		const hash1 = hashConfirmationToken(token1);
		const hash1Repeat = hashConfirmationToken(token1);
		expect(hash1).toBe(hash1Repeat);
		expect(hash1).not.toBe(token1);
	});

	it('creates 1-hour token and stores SHA-256 hash in database', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		setupTestUser(db);

		const before = Date.now();
		const result = await createEmailConfirmationToken(db, 'user-confirm-test-1');
		const after = Date.now();

		expect(CONFIRMATION_TOKEN_EXPIRATION_MS).toBe(60 * 60 * 1000);
		expect(result.token).toBeTruthy();
		expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + CONFIRMATION_TOKEN_EXPIRATION_MS);
		expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after + CONFIRMATION_TOKEN_EXPIRATION_MS);

		// Verify database stores the hashed token, not the plaintext token
		const records = db.select().from(schema.emailConfirmationTokens).all();
		expect(records.length).toBe(1);
		expect(records[0].userId).toBe('user-confirm-test-1');
		expect(records[0].tokenHash).toBe(hashConfirmationToken(result.token));
		expect(records[0].tokenHash).not.toBe(result.token);

		sqlite.close();
	});

	it('enforces one active confirmation token per user by purging prior unused tokens', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		setupTestUser(db);

		const first = await createEmailConfirmationToken(db, 'user-confirm-test-1');
		const second = await createEmailConfirmationToken(db, 'user-confirm-test-1');

		expect(first.token).not.toBe(second.token);

		const records = db.select().from(schema.emailConfirmationTokens).all();
		expect(records.length).toBe(1);
		expect(records[0].tokenHash).toBe(hashConfirmationToken(second.token));

		const firstValidation = await validateConfirmationToken(db, first.token);
		expect(firstValidation.tokenRecord).toBeNull();
		expect(firstValidation.user).toBeNull();

		const secondValidation = await validateConfirmationToken(db, second.token);
		expect(secondValidation.tokenRecord).not.toBeNull();
		expect(secondValidation.user).not.toBeNull();
		expect(secondValidation.user?.username).toBe('confirmtypist');

		sqlite.close();
	});

	it('rejects expired confirmation token and cleans it up from the database', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		setupTestUser(db);

		const { token, id } = await createEmailConfirmationToken(db, 'user-confirm-test-1');

		// Set expiration to the past
		db.update(schema.emailConfirmationTokens)
			.set({ expiresAt: new Date(Date.now() - 5000) })
			.where(eq(schema.emailConfirmationTokens.id, id))
			.run();

		const result = await validateConfirmationToken(db, token);
		expect(result.tokenRecord).toBeNull();
		expect(result.user).toBeNull();
		expect(result.expired).toBe(true);

		// Record should be deleted
		const records = db.select().from(schema.emailConfirmationTokens).all();
		expect(records.length).toBe(0);

		sqlite.close();
	});

	it('rejects nonexistent or empty token string', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');

		const resultEmpty = await validateConfirmationToken(db, '');
		expect(resultEmpty.tokenRecord).toBeNull();
		expect(resultEmpty.user).toBeNull();

		const resultNonExistent = await validateConfirmationToken(db, 'nonexistent-token-1234567890');
		expect(resultNonExistent.tokenRecord).toBeNull();
		expect(resultNonExistent.user).toBeNull();

		sqlite.close();
	});

	it('invalidates a confirmation token by id', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		setupTestUser(db);

		const { token, id } = await createEmailConfirmationToken(db, 'user-confirm-test-1');
		await invalidateConfirmationToken(db, id);

		const result = await validateConfirmationToken(db, token);
		expect(result.tokenRecord).toBeNull();

		sqlite.close();
	});

	it('invalidates all confirmation tokens for a user', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		setupTestUser(db, 'u1', 'user1', 'u1@example.com');
		setupTestUser(db, 'u2', 'user2', 'u2@example.com');

		const t1 = await createEmailConfirmationToken(db, 'u1');
		const t2 = await createEmailConfirmationToken(db, 'u2');

		await invalidateUserConfirmationTokens(db, 'u1');

		const res1 = await validateConfirmationToken(db, t1.token);
		const res2 = await validateConfirmationToken(db, t2.token);

		expect(res1.tokenRecord).toBeNull();
		expect(res2.tokenRecord).not.toBeNull();

		sqlite.close();
	});
});
