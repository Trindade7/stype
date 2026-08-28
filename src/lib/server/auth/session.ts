import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';
import type { Session, User } from '../db/schema';

export const SESSION_COOKIE_NAME = 'stype_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SafeUser = Omit<User, 'passwordHash'>;

export interface SessionValidationResult {
	session: Session | null;
	user: SafeUser | null;
}

export function generateSessionToken(): string {
	return randomBytes(32).toString('hex');
}

export async function createSession(
	db: BetterSQLite3Database<typeof schema>,
	userId: string
): Promise<Session> {
	const sessionId = generateSessionToken();
	const createdAt = new Date();
	const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

	const session = db
		.insert(schema.sessions)
		.values({
			id: sessionId,
			userId,
			expiresAt,
			createdAt
		})
		.returning()
		.get();

	return session;
}

export async function validateSession(
	db: BetterSQLite3Database<typeof schema>,
	sessionId: string
): Promise<SessionValidationResult> {
	const session = db
		.select()
		.from(schema.sessions)
		.where(eq(schema.sessions.id, sessionId))
		.get();

	if (!session) {
		return { session: null, user: null };
	}

	if (session.expiresAt.getTime() <= Date.now()) {
		db.delete(schema.sessions)
			.where(eq(schema.sessions.id, sessionId))
			.run();
		return { session: null, user: null };
	}

	const user = db
		.select({
			id: schema.users.id,
			username: schema.users.username,
			email: schema.users.email,
			name: schema.users.name,
			createdAt: schema.users.createdAt
		})
		.from(schema.users)
		.where(eq(schema.users.id, session.userId))
		.get();

	if (!user) {
		db.delete(schema.sessions)
			.where(eq(schema.sessions.id, sessionId))
			.run();
		return { session: null, user: null };
	}

	return { session, user };
}

export async function invalidateSession(
	db: BetterSQLite3Database<typeof schema>,
	sessionId: string
): Promise<void> {
	db.delete(schema.sessions)
		.where(eq(schema.sessions.id, sessionId))
		.run();
}

export async function invalidateUserSessions(
	db: BetterSQLite3Database<typeof schema>,
	userId: string
): Promise<void> {
	db.delete(schema.sessions)
		.where(eq(schema.sessions.userId, userId))
		.run();
}
