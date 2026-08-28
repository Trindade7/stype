const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SYMBOLS;

export function generateRandomPassword(length: number = 16): string {
	const effectiveLength = Math.max(8, length);

	// Get cryptographically secure random bytes
	const randomValues = new Uint8Array(effectiveLength + 8);
	globalThis.crypto.getRandomValues(randomValues);

	// Ensure at least one of each required character class
	const passwordChars: string[] = [
		UPPERCASE[randomValues[0] % UPPERCASE.length],
		LOWERCASE[randomValues[1] % LOWERCASE.length],
		DIGITS[randomValues[2] % DIGITS.length],
		SYMBOLS[randomValues[3] % SYMBOLS.length]
	];

	// Fill remaining characters
	for (let i = 4; i < effectiveLength; i++) {
		passwordChars.push(ALL_CHARS[randomValues[i] % ALL_CHARS.length]);
	}

	// Shuffle using Fisher-Yates with crypto random bytes
	const shuffleValues = new Uint8Array(effectiveLength);
	globalThis.crypto.getRandomValues(shuffleValues);

	for (let i = passwordChars.length - 1; i > 0; i--) {
		const j = shuffleValues[i] % (i + 1);
		const temp = passwordChars[i];
		passwordChars[i] = passwordChars[j];
		passwordChars[j] = temp;
	}

	return passwordChars.join('');
}
