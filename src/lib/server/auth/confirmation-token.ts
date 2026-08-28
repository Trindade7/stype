import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';
import type { EmailConfirmationToken } from '../db/schema';
import type { SafeUser } from './session';

export const CONFIRMATION_TOKEN_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour

export interface ConfirmationTokenValidationResult {
	tokenRecord: EmailConfirmationToken | null;
	user: SafeUser | null;
	expired?: boolean;
}

export function generateConfirmationToken(): string {
	return randomBytes(32).toString('hex');
}

export function hashConfirmationToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export async function createEmailConfirmationToken(
	db: BetterSQLite3Database<typeof schema>,
	userId: string
): Promise<{ token: string; expiresAt: Date; id: string }> {
	// Invalidate any existing unused confirmation tokens for this user
	db.delete(schema.emailConfirmationTokens)
		.where(eq(schema.emailConfirmationTokens.userId, userId))
		.run();

	const token = generateConfirmationToken();
	const tokenHash = hashConfirmationToken(token);
	const now = Date.now();
	const createdAt = new Date(now);
	const expiresAt = new Date(now + CONFIRMATION_TOKEN_EXPIRATION_MS);
	const id = randomUUID();

	db.insert(schema.emailConfirmationTokens)
		.values({
			id,
			userId,
			tokenHash,
			expiresAt,
			createdAt
		})
		.run();

	return { token, expiresAt, id };
}

export async function validateConfirmationToken(
	db: BetterSQLite3Database<typeof schema>,
	token: string
): Promise<ConfirmationTokenValidationResult> {
	if (!token) {
		return { tokenRecord: null, user: null, expired: false };
	}

	const tokenHash = hashConfirmationToken(token);
	const tokenRecord = db
		.select()
		.from(schema.emailConfirmationTokens)
		.where(eq(schema.emailConfirmationTokens.tokenHash, tokenHash))
		.get();

	if (!tokenRecord) {
		return { tokenRecord: null, user: null, expired: false };
	}

	if (tokenRecord.expiresAt.getTime() <= Date.now()) {
		db.delete(schema.emailConfirmationTokens)
			.where(eq(schema.emailConfirmationTokens.id, tokenRecord.id))
			.run();
		return { tokenRecord: null, user: null, expired: true };
	}

	const user = db
		.select({
			id: schema.users.id,
			username: schema.users.username,
			email: schema.users.email,
			name: schema.users.name,
			role: schema.users.role,
			emailConfirmed: schema.users.emailConfirmed,
			createdAt: schema.users.createdAt
		})
		.from(schema.users)
		.where(eq(schema.users.id, tokenRecord.userId))
		.get();

	if (!user) {
		db.delete(schema.emailConfirmationTokens)
			.where(eq(schema.emailConfirmationTokens.id, tokenRecord.id))
			.run();
		return { tokenRecord: null, user: null, expired: false };
	}

	return { tokenRecord, user, expired: false };
}

export async function invalidateConfirmationToken(
	db: BetterSQLite3Database<typeof schema>,
	tokenId: string
): Promise<void> {
	db.delete(schema.emailConfirmationTokens)
		.where(eq(schema.emailConfirmationTokens.id, tokenId))
		.run();
}

export async function invalidateUserConfirmationTokens(
	db: BetterSQLite3Database<typeof schema>,
	userId: string
): Promise<void> {
	db.delete(schema.emailConfirmationTokens)
		.where(eq(schema.emailConfirmationTokens.userId, userId))
		.run();
}
