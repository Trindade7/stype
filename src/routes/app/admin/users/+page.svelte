<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ShieldUserIcon,
		UserAdd01Icon,
		Search01Icon,
		Alert01Icon,
		MoreVerticalIcon,
		Edit01Icon,
		Key01Icon,
		MailSend01Icon,
		Delete01Icon
	} from '@hugeicons/core-free-icons';

	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { generateRandomPassword } from '$lib/password-utils';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let searchQuery = $state('');
	let lastServerSearch = '';

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	$effect.pre(() => {
		if (data.search !== undefined && data.search !== lastServerSearch) {
			lastServerSearch = data.search;
			searchQuery = data.search;
		}
	});

	$effect(() => {
		return () => {
			if (debounceTimer) clearTimeout(debounceTimer);
		};
	});

	function handleSearchInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			if (typeof window === 'undefined') return;
			const currentUrl = new URL(window.location.href);
			const trimmed = searchQuery.trim();
			if (trimmed) {
				currentUrl.searchParams.set('search', trimmed);
			} else {
				currentUrl.searchParams.delete('search');
			}
			currentUrl.searchParams.set('page', '1');
			goto(`${currentUrl.pathname}?${currentUrl.searchParams.toString()}`, {
				replaceState: true,
				noScroll: true,
				keepFocus: true
			});
		}, 300);
	}
	let isCreateDialogOpen = $state(false);
	let formName = $state('');
	let formUsername = $state('');
	let formEmail = $state('');
	let formPassword = $state('');
	let formRole = $state('user');

	let isEditDialogOpen = $state(false);
	let editingUser = $state<any>(null);
	let editUserId = $state('');
	let editName = $state('');
	let editEmail = $state('');
	let editRole = $state('user');
	let editEmailConfirmed = $state(true);

	let isSelfDemoteDialogOpen = $state(false);
	let isConfirmedSelfDemotion = $state(false);
	let editFormElement: HTMLFormElement | undefined = $state();

	let isResetPasswordDialogOpen = $state(false);
	let resetUser = $state<any>(null);
	let resetUserId = $state('');
	let resetPasswordValue = $state('');

	let isDeleteDialogOpen = $state(false);
	let deletingUser = $state<any>(null);
	let deleteUserId = $state('');

	$effect.pre(() => {
		if (form?.action === 'createUser' && !form.success) {
			isCreateDialogOpen = true;
			if (form.values) {
				if (form.values.name !== undefined) formName = form.values.name;
				if (form.values.username !== undefined) formUsername = form.values.username;
				if (form.values.email !== undefined) formEmail = form.values.email;
				if (form.values.role !== undefined) formRole = form.values.role;
			}
		}
		if (form?.action === 'updateUser' && !form.success) {
			isEditDialogOpen = true;
			const updateForm = form as any;
			if (updateForm.values) {
				if (updateForm.values.id !== undefined) editUserId = updateForm.values.id;
				if (updateForm.values.name !== undefined) editName = updateForm.values.name;
				if (updateForm.values.email !== undefined) editEmail = updateForm.values.email;
				if (updateForm.values.role !== undefined) editRole = updateForm.values.role;
				if (updateForm.values.emailConfirmed !== undefined) {
					editEmailConfirmed = updateForm.values.emailConfirmed === 'true' || updateForm.values.emailConfirmed === true;
				}
			}
		}
		if (form?.action === 'resetPassword' && !form.success) {
			isResetPasswordDialogOpen = true;
			const resetForm = form as any;
			if (resetForm.values?.id) {
				resetUserId = resetForm.values.id;
				resetUser = (data.users ?? []).find((u: any) => u.id === resetForm.values.id) ?? null;
			}
		}
		if (form?.action === 'sendResetLink' && !form.success) {
			isResetPasswordDialogOpen = true;
			const sendForm = form as any;
			if (sendForm.values?.id) {
				resetUserId = sendForm.values.id;
				resetUser = (data.users ?? []).find((u: any) => u.id === sendForm.values.id) ?? null;
			}
		}
		if (form?.action === 'deleteUser' && !form.success) {
			isDeleteDialogOpen = true;
			const deleteForm = form as any;
			if (deleteForm.values?.id) {
				deleteUserId = deleteForm.values.id;
				deletingUser = (data.users ?? []).find((u: any) => u.id === deleteForm.values.id) ?? null;
			}
		}
	});

	function handleGenerateRandomPassword() {
		formPassword = generateRandomPassword(16);
	}

	function openResetPasswordModal(user: any) {
		resetUser = user;
		resetUserId = user.id;
		resetPasswordValue = '';
		isResetPasswordDialogOpen = true;
	}

	function handleGenerateResetPassword() {
		resetPasswordValue = generateRandomPassword(16);
	}

	function openDeleteModal(user: any) {
		deletingUser = user;
		deleteUserId = user.id;
		isDeleteDialogOpen = true;
	}

	function openEditModal(user: any) {
		editingUser = user;
		editUserId = user.id;
		editName = user.name ?? '';
		editEmail = user.email ?? '';
		editRole = user.role ?? 'user';
		editEmailConfirmed = Boolean(user.emailConfirmed);
		isConfirmedSelfDemotion = false;
		isEditDialogOpen = true;
	}

	function handleSaveClick(event: MouseEvent) {
		const currentUserId = data.user?.id;
		const isSelfDemotion =
			editingUser &&
			editingUser.id === currentUserId &&
			editingUser.role === 'admin' &&
			editRole === 'user';

		if (isSelfDemotion && !isConfirmedSelfDemotion) {
			event.preventDefault();
			event.stopPropagation();
			isSelfDemoteDialogOpen = true;
		}
	}

	function handleEditFormSubmit(event: SubmitEvent) {
		const currentUserId = data.user?.id;
		const isSelfDemotion =
			editingUser &&
			editingUser.id === currentUserId &&
			editingUser.role === 'admin' &&
			editRole === 'user';

		if (isSelfDemotion && !isConfirmedSelfDemotion) {
			event.preventDefault();
			event.stopPropagation();
			isSelfDemoteDialogOpen = true;
		}
	}

	function handleConfirmSelfDemotion() {
		isConfirmedSelfDemotion = true;
		isSelfDemoteDialogOpen = false;
		if (typeof editFormElement?.requestSubmit === 'function') {
			editFormElement.requestSubmit();
		} else {
			editFormElement?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
		}
	}

	function formatDate(date: string | Date | number): string {
		const d = new Date(date);
		return d.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	let formErrors = $derived(form?.action === 'createUser' && !form.success ? form.errors : undefined);
	let editErrors = $derived(form?.action === 'updateUser' && !form.success ? form.errors : undefined);
	let resetPasswordErrors = $derived(form?.action === 'resetPassword' && !form.success ? (form as any).errors : undefined);
	let canSendResetLink = $derived(Boolean(data.smtpConfigured && resetUser?.emailConfirmed && resetUser?.email));

	let pagination = $derived(
		data.pagination ?? {
			page: 1,
			perPage: 25,
			totalCount: (data.users ?? []).length,
			totalPages: Math.max(1, Math.ceil((data.users ?? []).length / 25))
		}
	);

	let rangeStart = $derived((pagination.page - 1) * pagination.perPage + 1);
	let rangeEnd = $derived(Math.min(pagination.page * pagination.perPage, pagination.totalCount));

	function handlePageChange(newPage: number) {
		if (newPage === pagination.page) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', String(newPage));
		goto(`${url.pathname}?${url.searchParams.toString()}`, {
			noScroll: true,
			keepFocus: true
		});
	}

	$effect(() => {
		if (typeof window !== 'undefined' && data.pagination) {
			const currentUrl = new URL(window.location.href);
			if (currentUrl.searchParams.has('page')) {
				const urlPage = parseInt(currentUrl.searchParams.get('page') ?? '', 10);
				if (isNaN(urlPage) || urlPage !== data.pagination.page) {
					currentUrl.searchParams.set('page', String(data.pagination.page));
					goto(`${currentUrl.pathname}?${currentUrl.searchParams.toString()}`, {
						replaceState: true,
						noScroll: true,
						keepFocus: true
					});
				}
			}
		}
	});

	let users = $derived(data.users ?? []);
</script>

<svelte:head>
	<title>Administration — Stype</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-6 py-8 w-full">
	<div class="mb-8">
		<div class="flex items-center gap-2">
			<HugeiconsIcon icon={ShieldUserIcon} size={28} class="text-primary" />
			<h1 class="text-3xl font-bold tracking-tight">Administration</h1>
		</div>
		<p class="text-muted-foreground mt-1">Manage users, account credentials, and system roles.</p>
	</div>

	<!-- Action Toolbar -->
	<div class="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
		<div class="relative flex-1 max-w-sm">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
				<HugeiconsIcon icon={Search01Icon} size={16} />
			</div>
			<Input
				type="text"
				placeholder="Search users by name, username, or email..."
				bind:value={searchQuery}
				oninput={handleSearchInput}
				aria-label="Search users"
				class="pl-9 h-9"
			/>
		</div>

		<Dialog.Root bind:open={isCreateDialogOpen}>
			<Dialog.Trigger class={buttonVariants({ variant: 'default' })}>
				<HugeiconsIcon icon={UserAdd01Icon} size={16} class="mr-2" />
				Create User
			</Dialog.Trigger>
			<Dialog.Content class="sm:max-w-md">
				<Dialog.Header>
					<Dialog.Title>Create User</Dialog.Title>
					<Dialog.Description>
						Add a new user with initial credentials and system role.
					</Dialog.Description>
				</Dialog.Header>

				{#if form?.action === 'createUser' && !form.success && form.message}
					<div
						role="alert"
						class="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive"
					>
						<HugeiconsIcon icon={Alert01Icon} size={16} class="shrink-0" />
						<span>{form.message}</span>
					</div>
				{/if}

				<form
					method="POST"
					action="?/createUser"
					class="space-y-4"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								isCreateDialogOpen = false;
								formName = '';
								formUsername = '';
								formEmail = '';
								formPassword = '';
								formRole = 'user';
								searchQuery = '';
								await goto('/app/admin/users?page=1', {
									noScroll: true,
									keepFocus: true
								});
							}
							await update();
						};
					}}
				>
					<div class="space-y-1.5">
						<Label for="create-name">Display Name</Label>
						<Input
							id="create-name"
							name="name"
							bind:value={formName}
							placeholder="Display name"
							required
							maxlength={50}
							aria-invalid={formErrors?.name ? 'true' : undefined}
						/>
						{#if formErrors?.name}
							<p role="alert" class="text-xs text-destructive">{formErrors.name}</p>
						{/if}
					</div>

					<div class="space-y-1.5">
						<Label for="create-username">Username</Label>
						<Input
							id="create-username"
							name="username"
							bind:value={formUsername}
							placeholder="e.g. johndoe"
							required
							aria-invalid={formErrors?.username ? 'true' : undefined}
						/>
						{#if formErrors?.username}
							<p role="alert" class="text-xs text-destructive">{formErrors.username}</p>
						{/if}
					</div>

					<div class="space-y-1.5">
						<Label for="create-email">Email</Label>
						<Input
							id="create-email"
							type="email"
							name="email"
							bind:value={formEmail}
							placeholder="user@example.com"
							required
							aria-invalid={formErrors?.email ? 'true' : undefined}
						/>
						{#if formErrors?.email}
							<p role="alert" class="text-xs text-destructive">{formErrors.email}</p>
						{/if}
					</div>

					<div class="space-y-1.5">
						<div class="flex items-center justify-between">
							<Label for="create-password">Password</Label>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								class="h-auto p-0 text-xs text-primary hover:underline hover:bg-transparent"
								onclick={handleGenerateRandomPassword}
							>
								Generate random password
							</Button>
						</div>
						<Input
							id="create-password"
							type="text"
							name="password"
							bind:value={formPassword}
							placeholder="Minimum 8 characters"
							required
							minlength={8}
							aria-invalid={formErrors?.password ? 'true' : undefined}
						/>
						{#if formErrors?.password}
							<p role="alert" class="text-xs text-destructive">{formErrors.password}</p>
						{/if}
					</div>

					<div class="space-y-1.5">
						<Label for="create-role">Role</Label>
						<Select.Root type="single" name="role" bind:value={formRole}>
							<Select.Trigger
								id="create-role"
								role="combobox"
								aria-label="Role"
								aria-invalid={formErrors?.role ? 'true' : undefined}
								class="w-full justify-between"
							>
								{formRole === 'admin' ? 'Admin' : 'User'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="user" label="User">User</Select.Item>
								<Select.Item value="admin" label="Admin">Admin</Select.Item>
							</Select.Content>
						</Select.Root>
						{#if formErrors?.role}
							<p role="alert" class="text-xs text-destructive">{formErrors.role}</p>
						{/if}
					</div>

					<Dialog.Footer class="pt-2">
						<Button type="button" variant="outline" onclick={() => (isCreateDialogOpen = false)}>
							Cancel
						</Button>
						<Button type="submit">Create User</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>

		<!-- Edit User Dialog -->
		<Dialog.Root bind:open={isEditDialogOpen}>
			<Dialog.Content class="sm:max-w-md">
				<Dialog.Header>
					<Dialog.Title>Edit User Details</Dialog.Title>
					<Dialog.Description>
						Update display name, email, role, and verification status.
					</Dialog.Description>
				</Dialog.Header>

				{#if form?.action === 'updateUser' && !form.success && form.message}
					<div
						role="alert"
						class="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive"
					>
						<HugeiconsIcon icon={Alert01Icon} size={16} class="shrink-0" />
						<span>{form.message}</span>
					</div>
				{/if}

				<form
					bind:this={editFormElement}
					method="POST"
					action="?/updateUser"
					class="space-y-4"
					onsubmit={handleEditFormSubmit}
					use:enhance={(opts) => {
						if (opts?.formData && isConfirmedSelfDemotion) {
							opts.formData.set('confirmSelfDemotion', 'true');
						}
						return async ({ result, update }) => {
							if (result.type === 'success') {
								if (result.data?.demotedSelf) {
									window.location.href = '/app';
									return;
								}
								isEditDialogOpen = false;
								isSelfDemoteDialogOpen = false;
								isConfirmedSelfDemotion = false;
								editingUser = null;
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={editUserId} />
					<input type="hidden" name="confirmSelfDemotion" value={isConfirmedSelfDemotion ? 'true' : 'false'} />

					<div class="space-y-1.5">
						<Label for="edit-name">Display Name</Label>
						<Input
							id="edit-name"
							name="name"
							bind:value={editName}
							placeholder="Display name"
							required
							maxlength={50}
							aria-invalid={editErrors?.name ? 'true' : undefined}
						/>
						{#if editErrors?.name}
							<p role="alert" class="text-xs text-destructive">{editErrors.name}</p>
						{/if}
					</div>

					<div class="space-y-1.5">
						<Label for="edit-email">Email</Label>
						<Input
							id="edit-email"
							type="email"
							name="email"
							bind:value={editEmail}
							placeholder="user@example.com"
							required
							aria-invalid={editErrors?.email ? 'true' : undefined}
						/>
						{#if editErrors?.email}
							<p role="alert" class="text-xs text-destructive">{editErrors.email}</p>
						{/if}
					</div>

					<div class="space-y-1.5">
						<Label for="edit-role">Role</Label>
						<Select.Root type="single" name="role" bind:value={editRole}>
							<Select.Trigger
								id="edit-role"
								role="combobox"
								aria-label="Role"
								aria-invalid={editErrors?.role ? 'true' : undefined}
								class="w-full justify-between"
							>
								{editRole === 'admin' ? 'Admin' : 'User'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="user" label="User">User</Select.Item>
								<Select.Item value="admin" label="Admin">Admin</Select.Item>
							</Select.Content>
						</Select.Root>
						{#if editErrors?.role}
							<p role="alert" class="text-xs text-destructive">{editErrors.role}</p>
						{/if}
					</div>

					<div class="flex items-center justify-between rounded-lg border border-border p-3">
						<div class="space-y-0.5">
							<Label for="edit-email-confirmed" class="font-medium cursor-pointer">Email Verified</Label>
							<p class="text-xs text-muted-foreground">
								Keep user email marked as confirmed.
							</p>
						</div>
						<Switch id="edit-email-confirmed" bind:checked={editEmailConfirmed} />
						<input type="hidden" name="emailConfirmed" value={editEmailConfirmed ? 'true' : 'false'} />
					</div>

					<Dialog.Footer class="pt-2">
						<Button type="button" variant="outline" onclick={() => (isEditDialogOpen = false)}>
							Cancel
						</Button>
						<Button type="submit" onclick={handleSaveClick}>Save Changes</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>

		<!-- Confirmation Dialog for Self-Demotion -->
		<Dialog.Root bind:open={isSelfDemoteDialogOpen}>
			<Dialog.Content class="sm:max-w-md">
				<Dialog.Header>
					<Dialog.Title>Confirm Demotion</Dialog.Title>
					<Dialog.Description class="text-destructive font-medium">
						Warning: Demoting your account to User will revoke your administrative privileges immediately.
					</Dialog.Description>
				</Dialog.Header>
				<p class="text-sm text-muted-foreground">
					Administrative privileges will be revoked immediately. You will no longer have access to user management or administrative settings. Are you sure you want to proceed?
				</p>
				<Dialog.Footer class="pt-2">
					<Button
						type="button"
						variant="outline"
						onclick={() => {
							isSelfDemoteDialogOpen = false;
						}}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						onclick={handleConfirmSelfDemotion}
					>
						Confirm Demotion
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>

		<!-- Reset Password Dialog -->
		<Dialog.Root bind:open={isResetPasswordDialogOpen}>
			<Dialog.Content class="sm:max-w-md">
				<Dialog.Header>
					<Dialog.Title>Reset Password</Dialog.Title>
					<Dialog.Description>
						Set a new password for {resetUser?.name || resetUser?.username || 'the user'} directly or send an email reset link.
					</Dialog.Description>
				</Dialog.Header>

				{#if form?.action === 'resetPassword' && !form.success && form.message}
					<div
						role="alert"
						class="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive"
					>
						<HugeiconsIcon icon={Alert01Icon} size={16} class="shrink-0" />
						<span>{form.message}</span>
					</div>
				{/if}

				{#if form?.action === 'sendResetLink' && !form.success && form.message}
					<div
						role="alert"
						class="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive"
					>
						<HugeiconsIcon icon={Alert01Icon} size={16} class="shrink-0" />
						<span>{form.message}</span>
					</div>
				{/if}

				<!-- Direct Password Reset Form -->
				<form
					method="POST"
					action="?/resetPassword"
					class="space-y-4"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								if ((result.data as any)?.resetSelf) {
									window.location.href = '/app/login';
									return;
								}
								isResetPasswordDialogOpen = false;
								resetPasswordValue = '';
								resetUser = null;
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={resetUserId} />

					<div class="space-y-1.5">
						<div class="flex items-center justify-between">
							<Label for="reset-password-input">New Password</Label>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								class="h-auto p-0 text-xs text-primary hover:underline hover:bg-transparent"
								onclick={handleGenerateResetPassword}
							>
								Generate random password
							</Button>
						</div>
						<Input
							id="reset-password-input"
							type="text"
							name="password"
							bind:value={resetPasswordValue}
							placeholder="Minimum 8 characters"
							required
							minlength={8}
							aria-invalid={resetPasswordErrors?.password ? 'true' : undefined}
						/>
						{#if resetPasswordErrors?.password}
							<p role="alert" class="text-xs text-destructive">{resetPasswordErrors.password}</p>
						{/if}
					</div>

					<p class="text-xs text-muted-foreground">
						Resetting the password will immediately sign this user out of all active sessions.
					</p>

					<div class="flex justify-end gap-2 pt-1">
						<Button type="submit">Reset Password</Button>
					</div>
				</form>

				<!-- Secondary Action Divider -->
				<div class="relative my-2">
					<div class="absolute inset-0 flex items-center">
						<span class="w-full border-t border-border"></span>
					</div>
					<div class="relative flex justify-center text-xs uppercase">
						<span class="bg-card px-2 text-muted-foreground">Or</span>
					</div>
				</div>

				<!-- Send Reset Link Form -->
				<form
					method="POST"
					action="?/sendResetLink"
					class="space-y-2"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								isResetPasswordDialogOpen = false;
								resetPasswordValue = '';
								resetUser = null;
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={resetUserId} />

					<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-border p-3">
						<div class="space-y-0.5">
							<p class="text-sm font-medium">Send Password Reset Link</p>
							<p class="text-xs text-muted-foreground">
								Deliver a single-use 15-minute reset link to {resetUser?.email || 'the user'}. Active sessions will remain intact until redeemed.
							</p>
							{#if !data.smtpConfigured}
								<p class="text-xs text-amber-500 font-medium">
									Email delivery is not configured on this server.
								</p>
							{:else if !resetUser?.emailConfirmed}
								<p class="text-xs text-amber-500 font-medium">
									User email is unverified.
								</p>
							{/if}
						</div>
						<Button
							type="submit"
							variant="outline"
							size="sm"
							class="shrink-0"
							disabled={!canSendResetLink}
						>
							<HugeiconsIcon icon={MailSend01Icon} size={14} class="mr-2" />
							Send Reset Link
						</Button>
					</div>
				</form>

				<Dialog.Footer class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isResetPasswordDialogOpen = false)}>
						Cancel
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>

		<!-- Delete User Dialog -->
		<Dialog.Root bind:open={isDeleteDialogOpen}>
			<Dialog.Content class="sm:max-w-md">
				<Dialog.Header>
					<Dialog.Title>
						{deletingUser?.id === data.user?.id ? 'Delete Account' : 'Delete User'}
					</Dialog.Title>
					<Dialog.Description>
						{#if deletingUser?.id === data.user?.id}
							<span class="text-destructive font-medium">
								Warning: Your current session will terminate immediately.
							</span>
						{:else}
							Permanently remove this user account and all associated data.
						{/if}
					</Dialog.Description>
				</Dialog.Header>

				{#if form?.action === 'deleteUser' && !form.success && form.message}
					<div
						role="alert"
						class="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive"
					>
						<HugeiconsIcon icon={Alert01Icon} size={16} class="shrink-0" />
						<span>{form.message}</span>
					</div>
				{/if}

				{#if deletingUser?.id === data.user?.id}
					<div class="space-y-2 text-sm text-muted-foreground">
						<p>
							Warning: Your current session will terminate immediately. You are deleting your own account (<span class="font-medium text-foreground">{deletingUser?.name || deletingUser?.username}</span>). You will be logged out and redirected to the login screen.
						</p>
						<p>
							All associated sessions, passages, test runs, settings, and tokens will be permanently removed. This action cannot be undone.
						</p>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">
						Are you sure you want to delete <span class="font-medium text-foreground">{deletingUser?.name || deletingUser?.username}</span>? All associated sessions, passages, test runs, settings, and tokens will be permanently removed. This action cannot be undone.
					</p>
				{/if}

				<form
					method="POST"
					action="?/deleteUser"
					use:enhance={() => {
						const isSelf = deletingUser?.id === data.user?.id;
						return async ({ result, update }) => {
							if (result.type === 'redirect') {
								window.location.href = result.location;
								return;
							}
							if (result.type === 'success') {
								if (isSelf) {
									window.location.href = '/app/login';
									return;
								}
								isDeleteDialogOpen = false;
								deletingUser = null;
								deleteUserId = '';
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={deleteUserId} />
					<input
						type="hidden"
						name="confirmSelfDelete"
						value={deletingUser?.id === data.user?.id ? 'true' : 'false'}
					/>

					<Dialog.Footer class="pt-4 gap-2 sm:gap-0">
						<Button
							type="button"
							variant="outline"
							onclick={() => {
								isDeleteDialogOpen = false;
								deletingUser = null;
								deleteUserId = '';
							}}
						>
							Cancel
						</Button>
						<Button type="submit" variant="destructive">
							{deletingUser?.id === data.user?.id ? 'Delete Account' : 'Delete User'}
						</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</div>

	<!-- Registered Users Table -->
	<div class="rounded-md border border-border bg-card overflow-x-auto">
		<table class="w-full text-left text-sm">
			<thead>
				<tr class="border-b border-border bg-muted/40 text-muted-foreground">
					<th scope="col" class="py-3 px-4 font-semibold">Display Name</th>
					<th scope="col" class="py-3 px-4 font-semibold">Username</th>
					<th scope="col" class="py-3 px-4 font-semibold">Email</th>
					<th scope="col" class="py-3 px-4 font-semibold">Role</th>
					<th scope="col" class="py-3 px-4 font-semibold">Confirmation</th>
					<th scope="col" class="py-3 px-4 font-semibold">Registration Date</th>
					<th scope="col" class="py-3 px-4 font-semibold text-right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#if users.length === 0}
					<tr>
						<td colspan="7" class="p-8 text-center text-muted-foreground">
							No users found matching your search.
						</td>
					</tr>
				{:else}
					{#each users as user (user.id)}
						<tr class="border-b border-border/50 hover:bg-muted/30 transition-colors">
							<td class="py-3.5 px-4 font-medium">{user.name || '—'}</td>
							<td class="py-3.5 px-4 font-mono text-xs">{user.username}</td>
							<td class="py-3.5 px-4 text-muted-foreground">{user.email || '—'}</td>
							<td class="py-3.5 px-4">
								<Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
									{user.role === 'admin' ? 'Admin' : 'User'}
								</Badge>
							</td>
							<td class="py-3.5 px-4">
								<Badge
									variant={user.emailConfirmed ? 'outline' : 'secondary'}
									class={user.emailConfirmed
										? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5'
										: 'border-amber-500/30 text-amber-500 bg-amber-500/5'}
								>
									{user.emailConfirmed ? 'Verified' : 'Pending'}
								</Badge>
							</td>
							<td class="py-3.5 px-4 text-muted-foreground text-xs whitespace-nowrap">
								{formatDate(user.createdAt)}
							</td>
							<td class="py-3.5 px-4 text-right">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger
										class={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' h-8 w-8 rounded-md'}
										aria-label={`Actions for ${user.username}`}
									>
										<HugeiconsIcon icon={MoreVerticalIcon} size={16} />
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Item onclick={() => openEditModal(user)}>
											<HugeiconsIcon icon={Edit01Icon} size={14} class="mr-2" />
											Edit Details
										</DropdownMenu.Item>
										<DropdownMenu.Item onclick={() => openResetPasswordModal(user)}>
											<HugeiconsIcon icon={Key01Icon} size={14} class="mr-2" />
											Reset Password
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="text-destructive focus:text-destructive"
											onclick={() => openDeleteModal(user)}
										>
											<HugeiconsIcon icon={Delete01Icon} size={14} class="mr-2" />
											Delete User
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Pagination Controls -->
	<div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
		<div class="text-sm text-muted-foreground">
			{#if pagination.totalCount === 0}
				No users found
			{:else}
				Showing {rangeStart} to {rangeEnd} of {pagination.totalCount} users
			{/if}
		</div>

		<Pagination.Root
			count={pagination.totalCount}
			perPage={pagination.perPage}
			page={pagination.page}
			onPageChange={(p) => handlePageChange(p)}
		>
			{#snippet children({ pages, currentPage })}
				<Pagination.Content>
					<Pagination.Item>
						<Pagination.Previous
							disabled={currentPage <= 1 || pagination.totalCount === 0}
						/>
					</Pagination.Item>
					{#each pages as page (page.key)}
						{#if page.type === 'ellipsis'}
							<Pagination.Item>
								<Pagination.Ellipsis />
							</Pagination.Item>
						{:else}
							<Pagination.Item>
								<Pagination.Link
									{page}
									isActive={currentPage === page.value}
									disabled={pagination.totalCount === 0}
								>
									{page.value}
								</Pagination.Link>
							</Pagination.Item>
						{/if}
					{/each}
					<Pagination.Item>
						<Pagination.Next
							disabled={currentPage >= pagination.totalPages || pagination.totalCount === 0}
						/>
					</Pagination.Item>
				</Pagination.Content>
			{/snippet}
		</Pagination.Root>
	</div>
</div>
