<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ShieldUserIcon,
		UserAdd01Icon,
		Search01Icon,
		Alert01Icon
	} from '@hugeicons/core-free-icons';

	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { generateRandomPassword } from '$lib/password-utils';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let searchQuery = $state('');
	let isCreateDialogOpen = $state(false);
	let formName = $state('');
	let formUsername = $state('');
	let formEmail = $state('');
	let formPassword = $state('');
	let formRole = $state('user');

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
	});

	function handleGenerateRandomPassword() {
		formPassword = generateRandomPassword(16);
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

	let users = $derived(data.users ?? []);
	let filteredUsers = $derived(
		users.filter((u) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase().trim();
			const matchName = u.name ? u.name.toLowerCase().includes(q) : false;
			const matchUsername = u.username ? u.username.toLowerCase().includes(q) : false;
			const matchEmail = u.email ? u.email.toLowerCase().includes(q) : false;
			return matchName || matchUsername || matchEmail;
		})
	);
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
						<select
							id="create-role"
							name="role"
							bind:value={formRole}
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
							aria-invalid={formErrors?.role ? 'true' : undefined}
						>
							<option value="user">User</option>
							<option value="admin">Admin</option>
						</select>
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
				</tr>
			</thead>
			<tbody>
				{#if filteredUsers.length === 0}
					<tr>
						<td colspan="6" class="p-8 text-center text-muted-foreground">
							No users found matching your search.
						</td>
					</tr>
				{:else}
					{#each filteredUsers as user (user.id)}
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
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
