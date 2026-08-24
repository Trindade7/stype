import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
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
				passwordHash,
				createdAt: new Date()
			})
			.run();
	}
}
