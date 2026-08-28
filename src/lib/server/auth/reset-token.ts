import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';
import type { PasswordResetToken } from '../db/schema';
import type { SafeUser } from './session';

export const RESET_TOKEN_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes

export interface ResetTokenValidationResult {
	tokenRecord: PasswordResetToken | null;
	user: SafeUser | null;
}

export function generateResetToken(): string {
	return randomBytes(32).toString('hex');
}

export function hashResetToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export async function createPasswordResetToken(
	db: BetterSQLite3Database<typeof schema>,
	userId: string
): Promise<{ token: string; expiresAt: Date; id: string }> {
	// Invalidate any existing unused reset tokens for this user
	db.delete(schema.passwordResetTokens)
		.where(eq(schema.passwordResetTokens.userId, userId))
		.run();

	const token = generateResetToken();
	const tokenHash = hashResetToken(token);
	const now = Date.now();
	const createdAt = new Date(now);
	const expiresAt = new Date(now + RESET_TOKEN_EXPIRATION_MS);
	const id = randomUUID();

	db.insert(schema.passwordResetTokens)
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

export async function validateResetToken(
	db: BetterSQLite3Database<typeof schema>,
	token: string
): Promise<ResetTokenValidationResult> {
	if (!token) {
		return { tokenRecord: null, user: null };
	}

	const tokenHash = hashResetToken(token);
	const tokenRecord = db
		.select()
		.from(schema.passwordResetTokens)
		.where(eq(schema.passwordResetTokens.tokenHash, tokenHash))
		.get();

	if (!tokenRecord) {
		return { tokenRecord: null, user: null };
	}

	if (tokenRecord.expiresAt.getTime() <= Date.now()) {
		db.delete(schema.passwordResetTokens)
			.where(eq(schema.passwordResetTokens.id, tokenRecord.id))
			.run();
		return { tokenRecord: null, user: null };
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
		db.delete(schema.passwordResetTokens)
			.where(eq(schema.passwordResetTokens.id, tokenRecord.id))
			.run();
		return { tokenRecord: null, user: null };
	}

	return { tokenRecord, user };
}

export async function invalidateResetToken(
	db: BetterSQLite3Database<typeof schema>,
	tokenId: string
): Promise<void> {
	db.delete(schema.passwordResetTokens)
		.where(eq(schema.passwordResetTokens.id, tokenId))
		.run();
}

export async function invalidateUserResetTokens(
	db: BetterSQLite3Database<typeof schema>,
	userId: string
): Promise<void> {
	db.delete(schema.passwordResetTokens)
		.where(eq(schema.passwordResetTokens.userId, userId))
		.run();
}
