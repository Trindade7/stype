import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { load, actions } from './+page.server';
import { db } from '$lib/server/db';
import { users, passages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

describe('Passages Management Actions', () => {
	let testUserId: string;

	beforeEach(async () => {
		testUserId = crypto.randomUUID();
		await db.insert(users).values({
			id: testUserId,
			username: `testuser_${Date.now()}`,
			passwordHash: 'hash',
			createdAt: new Date()
		});
	});

	afterEach(async () => {
		await db.delete(users).where(eq(users.id, testUserId));
	});

	it('should create a new custom passage', async () => {
		const formData = new FormData();
		formData.append('text', 'This is a test custom passage.');
		formData.append('source', 'Test Source');

		const request = new Request('http://localhost', {
			method: 'POST',
			body: formData
		});

		const result = await actions.create({
			request,
			locals: { user: { id: testUserId, username: 'testuser' }, session: null }
		} as any);

		expect(result).toEqual({ success: true });

		const created = db.select().from(passages).where(eq(passages.userId, testUserId)).get();
		expect(created).toBeDefined();
		expect(created?.text).toBe('This is a test custom passage.');
		expect(created?.source).toBe('Test Source');
	});

	it('should list user custom passages along with seeded ones', async () => {
		// insert a custom passage
		await db.insert(passages).values({
			text: 'My Custom Text',
			userId: testUserId,
			createdAt: new Date()
		});

		const result = await load({
			locals: { user: { id: testUserId, username: 'testuser' }, session: null }
		} as any);

		expect(result.passages.length).toBeGreaterThan(0);
		const custom = result.passages.find(p => p.userId === testUserId);
		expect(custom).toBeDefined();
		expect(custom?.text).toBe('My Custom Text');

		const seeded = result.passages.find(p => p.userId === null);
		expect(seeded).toBeDefined();
	});

	it('should update a custom passage', async () => {
		const insertResult = await db.insert(passages).values({
			text: 'Original Text',
			userId: testUserId,
			createdAt: new Date()
		}).returning({ id: passages.id });

		const pId = insertResult[0].id;

		const formData = new FormData();
		formData.append('id', String(pId));
		formData.append('text', 'Updated Text');
		formData.append('source', 'Updated Source');

		const request = new Request('http://localhost', {
			method: 'POST',
			body: formData
		});

		const result = await actions.update({
			request,
			locals: { user: { id: testUserId, username: 'testuser' }, session: null }
		} as any);

		expect(result).toEqual({ success: true });

		const updated = db.select().from(passages).where(eq(passages.id, pId)).get();
		expect(updated?.text).toBe('Updated Text');
		expect(updated?.source).toBe('Updated Source');
	});

	it('should delete a custom passage', async () => {
		const insertResult = await db.insert(passages).values({
			text: 'To be deleted',
			userId: testUserId,
			createdAt: new Date()
		}).returning({ id: passages.id });

		const pId = insertResult[0].id;

		const formData = new FormData();
		formData.append('id', String(pId));

		const request = new Request('http://localhost', {
			method: 'POST',
			body: formData
		});

		const result = await actions.delete({
			request,
			locals: { user: { id: testUserId, username: 'testuser' }, session: null }
		} as any);

		expect(result).toEqual({ success: true });

		const deleted = db.select().from(passages).where(eq(passages.id, pId)).get();
		expect(deleted).toBeUndefined();
	});
});
