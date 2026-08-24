import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString('hex');
	const derivedKey = scryptSync(password, salt, KEY_LENGTH);
	return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	const parts = storedHash.split(':');
	if (parts.length !== 2) {
		return false;
	}

	const [salt, key] = parts;
	const keyBuffer = Buffer.from(key, 'hex');
	const derivedKey = scryptSync(password, salt, KEY_LENGTH);

	if (keyBuffer.length !== derivedKey.length) {
		return false;
	}

	return timingSafeEqual(keyBuffer, derivedKey);
}
