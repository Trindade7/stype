import { randomUUID } from 'node:crypto';
import { eq, count as drizzleCount } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { hashPassword } from '../auth/password';
import * as schema from './schema';

export async function seedAdminUser(
	db: BetterSQLite3Database<typeof schema>
): Promise<void> {
	const existingAdmin = db
		.select()
		.from(schema.users)
		.where(eq(schema.users.username, 'admin'))
		.get();

	if (!existingAdmin) {
		const passwordHash = await hashPassword('admin123');
		db.insert(schema.users)
			.values({
				id: randomUUID(),
				username: 'admin',
				email: 'admin@stype.local',
				name: 'Admin',
				role: 'admin',
				emailConfirmed: true,
				passwordHash,
				createdAt: new Date()
			})
			.run();
	} else if (!existingAdmin.email || !existingAdmin.name || existingAdmin.role !== 'admin' || !existingAdmin.emailConfirmed) {
		db.update(schema.users)
			.set({
				email: existingAdmin.email ?? 'admin@stype.local',
				name: existingAdmin.name ?? 'Admin',
				role: 'admin',
				emailConfirmed: true
			})
			.where(eq(schema.users.id, existingAdmin.id))
			.run();
	}
}

export async function seedPassages(
	db: BetterSQLite3Database<typeof schema>
): Promise<void> {
	const countResult = db
		.select({ count: drizzleCount() })
		.from(schema.passages)
		.get();

	if (!countResult || countResult.count === 0) {
		const passagesToInsert = [
			{
				text: "The quick brown fox jumps over the lazy dog.",
				source: "Classic English pangram"
			},
			{
				text: "A wizard's job is to vex chumps quickly in fog.",
				source: "Another pangram"
			},
			{
				text: "Hello world! This is a simple test passage for typing practice. Make sure you get the punctuation right.",
				source: "Test Passage"
			},
			{
				text: "SvelteKit is a framework for building web applications of all sizes, with a beautiful development experience and flexible routing.",
				source: "SvelteKit Docs"
			},
			{
				text: "In computer science, a data structure is a data organization, management, and storage format that enables efficient access and modification.",
				source: "Wikipedia"
			}
		];

		const now = new Date();
		db.insert(schema.passages)
			.values(
				passagesToInsert.map((p) => ({
					id: randomUUID(),
					...p,
					createdAt: now,
					updatedAt: now,
					deletedAt: null
				}))
			)
			.run();
	}
}
