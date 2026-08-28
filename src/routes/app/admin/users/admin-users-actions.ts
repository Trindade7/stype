import { randomUUID } from 'node:crypto';
import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { and, desc, eq, ne } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';

export function createAdminUsersPageLoad(db: BetterSQLite3Database<typeof schema>) {
	return async ({ locals }: RequestEvent) => {
		if (!locals.user) {
			redirect(303, '/app/login');
		}
		if (locals.user.role !== 'admin') {
			error(403, 'Forbidden');
		}

		const usersList = db
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
			.orderBy(desc(schema.users.createdAt))
			.all();

		return {
			users: usersList
		};
	};
}

export function createAdminCreateUserAction(db: BetterSQLite3Database<typeof schema>) {
	return async ({ request, locals }: RequestEvent) => {
		if (!locals.user) {
			return fail(401, {
				success: false as const,
				action: 'createUser' as const,
				message: 'Unauthorized',
				errors: {} as Record<string, string>,
				values: { name: '', username: '', email: '', role: 'user' }
			});
		}
		if (locals.user.role !== 'admin') {
			return fail(403, {
				success: false as const,
				action: 'createUser' as const,
				message: 'Forbidden',
				errors: {} as Record<string, string>,
				values: { name: '', username: '', email: '', role: 'user' }
			});
		}

		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		const username = data.get('username')?.toString().trim() ?? '';
		const email = data.get('email')?.toString().trim() ?? '';
		const password = data.get('password')?.toString() ?? '';
		const roleInput = data.get('role')?.toString().trim() || 'user';

		const errors: Record<string, string> = {};

		if (name.length < 1 || name.length > 50) {
			errors.name = 'Display name must be between 1 and 50 characters';
		}

		const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
		if (!usernameRegex.test(username)) {
			errors.username = 'Username must be between 3 and 20 alphanumeric characters, hyphens, or underscores';
		} else {
			const existingUser = db
				.select({ id: schema.users.id })
				.from(schema.users)
				.where(eq(schema.users.username, username))
				.get();
			if (existingUser) {
				errors.username = 'Username is already taken';
			}
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			errors.email = 'Please enter a valid email address';
		} else {
			const existingEmail = db
				.select({ id: schema.users.id })
				.from(schema.users)
				.where(eq(schema.users.email, email))
				.get();
			if (existingEmail) {
				errors.email = 'Email is already registered';
			}
		}

		if (password.length < 8) {
			errors.password = 'Password must be at least 8 characters';
		}

		if (roleInput !== 'admin' && roleInput !== 'user') {
			errors.role = 'Role must be either admin or user';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				success: false as const,
				action: 'createUser',
				message: 'Please resolve the errors in the form',
				errors,
				values: {
					name,
					username,
					email,
					role: roleInput
				}
			});
		}

		const role = roleInput as schema.UserRole;
		const passwordHash = await hashPassword(password);
		const userId = randomUUID();
		const now = new Date();

		db.insert(schema.users)
			.values({
				id: userId,
				username,
				email,
				name,
				role,
				emailConfirmed: true,
				passwordHash,
				createdAt: now
			})
			.run();

		return {
			success: true,
			action: 'createUser',
			message: 'User created successfully',
			user: {
				id: userId,
				username,
				email,
				name,
				role,
				emailConfirmed: true,
				createdAt: now
			}
		};
	};
}

export function createAdminUpdateUserAction(db: BetterSQLite3Database<typeof schema>) {
	return async ({ request, locals }: RequestEvent) => {
		if (!locals.user) {
			return fail(401, {
				success: false as const,
				action: 'updateUser' as const,
				message: 'Unauthorized'
			});
		}
		if (locals.user.role !== 'admin') {
			return fail(403, {
				success: false as const,
				action: 'updateUser' as const,
				message: 'Forbidden'
			});
		}

		const data = await request.formData();
		const id = data.get('id')?.toString().trim() ?? '';
		const name = data.get('name')?.toString().trim() ?? '';
		const email = data.get('email')?.toString().trim() ?? '';
		const roleInput = data.get('role')?.toString().trim() || 'user';
		const emailConfirmedRaw = data.get('emailConfirmed')?.toString();

		if (!id) {
			return fail(400, {
				success: false as const,
				action: 'updateUser' as const,
				message: 'User ID is required'
			});
		}

		const targetUser = db
			.select()
			.from(schema.users)
			.where(eq(schema.users.id, id))
			.get();

		if (!targetUser) {
			return fail(404, {
				success: false as const,
				action: 'updateUser' as const,
				message: 'User not found'
			});
		}

		const errors: Record<string, string> = {};

		if (name.length < 1 || name.length > 50) {
			errors.name = 'Display name must be between 1 and 50 characters';
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			errors.email = 'Please enter a valid email address';
		} else {
			const existingEmail = db
				.select({ id: schema.users.id })
				.from(schema.users)
				.where(and(eq(schema.users.email, email), ne(schema.users.id, id)))
				.get();
			if (existingEmail) {
				errors.email = 'Email is already registered';
			}
		}

		if (roleInput !== 'admin' && roleInput !== 'user') {
			errors.role = 'Role must be either admin or user';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				success: false as const,
				action: 'updateUser' as const,
				message: 'Please resolve the errors in the form',
				errors,
				values: {
					id,
					name,
					email,
					role: roleInput,
					emailConfirmed: emailConfirmedRaw
				}
			});
		}

		let newEmailConfirmed: boolean;
		if (emailConfirmedRaw === 'false' || emailConfirmedRaw === 'off') {
			newEmailConfirmed = false;
		} else if (emailConfirmedRaw === 'true' || emailConfirmedRaw === 'on') {
			newEmailConfirmed = true;
		} else {
			newEmailConfirmed = targetUser.emailConfirmed ?? true;
		}

		const isSelfDemotion = targetUser.id === locals.user.id && targetUser.role === 'admin' && roleInput === 'user';
		const confirmSelfDemotion = data.get('confirmSelfDemotion')?.toString() === 'true';

		if (isSelfDemotion && !confirmSelfDemotion) {
			return fail(400, {
				success: false as const,
				action: 'updateUser' as const,
				requiresConfirmation: true,
				message: 'Administrative privileges will be revoked immediately. Please confirm self-demotion.',
				values: {
					id,
					name,
					email,
					role: roleInput,
					emailConfirmed: emailConfirmedRaw
				}
			});
		}

		try {
			db.transaction((tx) => {
				if (targetUser.role === 'admin' && roleInput === 'user') {
					const admins = tx
						.select({ id: schema.users.id })
						.from(schema.users)
						.where(eq(schema.users.role, 'admin'))
						.all();

					if (admins.length <= 1) {
						throw new Error('SOLE_ADMIN_DEMOTION');
					}
				}

				tx.update(schema.users)
					.set({
						name,
						email,
						role: roleInput as schema.UserRole,
						emailConfirmed: newEmailConfirmed
					})
					.where(eq(schema.users.id, id))
					.run();
			});
		} catch (err: any) {
			if (err?.message === 'SOLE_ADMIN_DEMOTION') {
				return fail(400, {
					success: false as const,
					action: 'updateUser' as const,
					message: 'Cannot demote the sole administrator. At least one administrator must remain.',
					values: {
						id,
						name,
						email,
						role: roleInput,
						emailConfirmed: emailConfirmedRaw
					}
				});
			}
			throw err;
		}

		if (targetUser.id === locals.user.id) {
			locals.user.name = name;
			locals.user.email = email;
			locals.user.role = roleInput as schema.UserRole;
			locals.user.emailConfirmed = newEmailConfirmed;
		}

		return {
			success: true,
			action: 'updateUser',
			message: 'User details updated successfully',
			demotedSelf: isSelfDemotion,
			user: {
				id,
				username: targetUser.username,
				name,
				email,
				role: roleInput as schema.UserRole,
				emailConfirmed: newEmailConfirmed,
				createdAt: targetUser.createdAt
			}
		};
	};
}

