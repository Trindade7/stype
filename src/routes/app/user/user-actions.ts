import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '$lib/server/auth/password';

export function createUserPageLoad(db: BetterSQLite3Database<typeof schema>) {
	return async ({ locals }: RequestEvent) => {
		if (!locals.user) {
			redirect(303, '/app/login');
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
			.where(eq(schema.users.id, locals.user.id))
			.get();

		if (!user) {
			redirect(303, '/app/login');
		}

		return {
			user
		};
	};
}

export function createUpdateDetailsAction(db: BetterSQLite3Database<typeof schema>) {
	return async ({ request, locals }: RequestEvent) => {
		if (!locals.user) {
			return fail(401, { success: false as const, action: 'updateDetails', message: 'Unauthorized' });
		}

		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		const email = data.get('email')?.toString().trim() ?? '';

		if (name.length < 1 || name.length > 50) {
			return fail(400, {
				success: false as const,
				action: 'updateDetails',
				message: 'Display name must be between 1 and 50 characters',
				name,
				email
			});
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return fail(400, {
				success: false as const,
				action: 'updateDetails',
				message: 'Please enter a valid email address',
				name,
				email
			});
		}

		const existingEmailUser = db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(and(eq(schema.users.email, email), ne(schema.users.id, locals.user.id)))
			.get();

		if (existingEmailUser) {
			return fail(400, {
				success: false as const,
				action: 'updateDetails',
				message: 'Email is already registered by another user',
				name,
				email
			});
		}

		db.update(schema.users)
			.set({
				name,
				email
			})
			.where(eq(schema.users.id, locals.user.id))
			.run();

		locals.user.name = name;
		locals.user.email = email;

		return {
			success: true,
			action: 'updateDetails',
			message: 'User details updated successfully',
			name,
			email
		};
	};
}

export function createUpdatePasswordAction(db: BetterSQLite3Database<typeof schema>) {
	return async ({ request, locals }: RequestEvent) => {
		if (!locals.user) {
			return fail(401, { success: false as const, action: 'updatePassword', message: 'Unauthorized' });
		}

		const data = await request.formData();
		const currentPassword = data.get('currentPassword')?.toString() ?? '';
		const newPassword = data.get('newPassword')?.toString() ?? '';
		const confirmPassword = data.get('confirmPassword')?.toString() ?? '';

		if (!currentPassword) {
			return fail(400, {
				success: false as const,
				action: 'updatePassword',
				message: 'Current password is required'
			});
		}

		const user = db
			.select()
			.from(schema.users)
			.where(eq(schema.users.id, locals.user.id))
			.get();

		if (!user) {
			return fail(401, { success: false as const, action: 'updatePassword', message: 'User not found' });
		}

		const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
		if (!isCurrentValid) {
			return fail(400, {
				success: false as const,
				action: 'updatePassword',
				message: 'Current password is incorrect'
			});
		}

		if (newPassword.length < 8) {
			return fail(400, {
				success: false as const,
				action: 'updatePassword',
				message: 'New password must be at least 8 characters'
			});
		}

		if (newPassword !== confirmPassword) {
			return fail(400, {
				success: false as const,
				action: 'updatePassword',
				message: 'New password and confirmation do not match'
			});
		}

		const newPasswordHash = await hashPassword(newPassword);

		db.update(schema.users)
			.set({
				passwordHash: newPasswordHash
			})
			.where(eq(schema.users.id, locals.user.id))
			.run();

		return {
			success: true,
			action: 'updatePassword',
			message: 'Password updated successfully'
		};
	};
}
