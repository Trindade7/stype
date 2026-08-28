import { describe, expect, it } from 'vitest';
import { initializeDatabase } from '../db';
import * as schema from '../db/schema';
import {
	generateResetToken,
	hashResetToken,
	createPasswordResetToken,
	validateResetToken,
	RESET_TOKEN_EXPIRATION_MS
} from './reset-token';

describe('Password Reset Token Management', () => {
	function setupTestUser(db: any, id = 'user-test-1', username = 'testuser', email = 'test@stype.local') {
		db.insert(schema.users)
			.values({
				id,
				username,
				email,
				passwordHash: 'dummyhash',
				createdAt: new Date()
			})
			.run();
	}

	it('generates high-entropy reset token and deterministic hash', () => {
		const token1 = generateResetToken();
		const token2 = generateResetToken();

		expect(token1).toBeTruthy();
		expect(token2).toBeTruthy();
		expect(token1).not.toBe(token2);
		expect(token1.length).toBeGreaterThanOrEqual(32);

		const hash1 = hashResetToken(token1);
		const hash1Repeat = hashResetToken(token1);
		expect(hash1).toBe(hash1Repeat);
		expect(hash1).not.toBe(token1);
	});

	it('creates 15-minute single-use token and stores hashed token in database', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		setupTestUser(db);

		const before = Date.now();
		const result = await createPasswordResetToken(db, 'user-test-1');
		const after = Date.now();

		expect(result.token).toBeTruthy();
		expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + RESET_TOKEN_EXPIRATION_MS);
		expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after + RESET_TOKEN_EXPIRATION_MS);

		// Verify database stores the hashed token, not the plaintext token
		const records = db.select().from(schema.passwordResetTokens).all();
		expect(records.length).toBe(1);
		expect(records[0].userId).toBe('user-test-1');
		expect(records[0].tokenHash).toBe(hashResetToken(result.token));
		expect(records[0].tokenHash).not.toBe(result.token);

		sqlite.close();
	});

	it('enforces single-active-token rule by purging prior unused tokens for the user', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		setupTestUser(db);

		const first = await createPasswordResetToken(db, 'user-test-1');
		const second = await createPasswordResetToken(db, 'user-test-1');

		expect(first.token).not.toBe(second.token);

		// Only the second token should exist in the database
		const records = db.select().from(schema.passwordResetTokens).all();
		expect(records.length).toBe(1);
		expect(records[0].tokenHash).toBe(hashResetToken(second.token));

		// Validating the first token must now fail
		const validationFirst = await validateResetToken(db, first.token);
		expect(validationFirst.tokenRecord).toBeNull();
		expect(validationFirst.user).toBeNull();

		// Validating the second token succeeds
		const validationSecond = await validateResetToken(db, second.token);
		expect(validationSecond.tokenRecord).not.toBeNull();
		expect(validationSecond.user?.id).toBe('user-test-1');

		sqlite.close();
	});

	it('rejects expired tokens and cleans them from the database', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		setupTestUser(db);

		const rawToken = 'expired-raw-token';
		const tokenHash = hashResetToken(rawToken);

		// Insert expired token directly
		db.insert(schema.passwordResetTokens)
			.values({
				id: 'expired-id',
				userId: 'user-test-1',
				tokenHash,
				expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
				createdAt: new Date(Date.now() - 16 * 60 * 1000)
			})
			.run();

		const result = await validateResetToken(db, rawToken);
		expect(result.tokenRecord).toBeNull();
		expect(result.user).toBeNull();

		// Token record should have been purged
		const records = db.select().from(schema.passwordResetTokens).all();
		expect(records.length).toBe(0);

		sqlite.close();
	});

	it('returns null when validating non-existent token', async () => {
		const { db, sqlite } = initializeDatabase(':memory:');
		setupTestUser(db);

		const result = await validateResetToken(db, 'completely-bogus-token');
		expect(result.tokenRecord).toBeNull();
		expect(result.user).toBeNull();

		sqlite.close();
	});
});
