import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { initializeDatabase } from './index';
import { seedAdminUser } from './seed';
import * as schema from './schema';

describe('database initialization', () => {
	it('initializes in-memory database with tables and allows admin seeding', async () => {
		const { sqlite, db } = initializeDatabase(':memory:');
		await seedAdminUser(db);

		const admin = db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get();
		expect(admin).toBeDefined();
		expect(admin?.username).toBe('admin');

		sqlite.close();
	});
});
