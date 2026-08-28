import { describe, it, expect } from 'vitest';
import { generateRandomPassword } from './password-utils';

describe('password-utils', () => {
	describe('generateRandomPassword', () => {
		it('generates a password of default length 16', () => {
			const password = generateRandomPassword();
			expect(typeof password).toBe('string');
			expect(password.length).toBe(16);
		});

		it('generates a password of specified length >= 8', () => {
			const password20 = generateRandomPassword(20);
			expect(password20.length).toBe(20);

			const password8 = generateRandomPassword(8);
			expect(password8.length).toBe(8);
		});

		it('ensures minimum length of at least 8 characters even if lower requested', () => {
			const password = generateRandomPassword(4);
			expect(password.length).toBeGreaterThanOrEqual(8);
		});

		it('generates passwords with diverse character classes (upper, lower, digit, symbol)', () => {
			// Test over several runs to verify entropy and character set diversity
			for (let i = 0; i < 10; i++) {
				const password = generateRandomPassword(16);
				expect(/[A-Z]/.test(password)).toBe(true);
				expect(/[a-z]/.test(password)).toBe(true);
				expect(/[0-9]/.test(password)).toBe(true);
				expect(/[^A-Za-z0-9]/.test(password)).toBe(true);
			}
		});

		it('generates unique passwords across multiple calls', () => {
			const set = new Set<string>();
			for (let i = 0; i < 50; i++) {
				set.add(generateRandomPassword());
			}
			expect(set.size).toBe(50);
		});
	});
});
