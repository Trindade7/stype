import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing and verification', () => {
	it('hashes a password and verifies it correctly', async () => {
		const plainPassword = 'admin123';
		const hash = await hashPassword(plainPassword);

		expect(hash).toBeDefined();
		expect(hash).not.toEqual(plainPassword);

		const isValid = await verifyPassword(plainPassword, hash);
		expect(isValid).toBe(true);
	});

	it('rejects an incorrect password', async () => {
		const hash = await hashPassword('correct-password');
		const isValid = await verifyPassword('wrong-password', hash);
		expect(isValid).toBe(false);
	});

	it('produces different hashes for the same password due to salting', async () => {
		const hash1 = await hashPassword('admin123');
		const hash2 = await hashPassword('admin123');
		expect(hash1).not.toEqual(hash2);
	});
});
