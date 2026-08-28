<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		UserCircleIcon,
		UserIcon,
		Mail01Icon,
		Key01Icon,
		CheckmarkCircle02Icon,
		Alert01Icon,
		FloppyDiskIcon
	} from '@hugeicons/core-free-icons';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let name = $state('');
	let email = $state('');
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');

	$effect.pre(() => {
		if (data.user) {
			name = data.user.name ?? '';
			email = data.user.email ?? '';
		}
		if (form?.action === 'updateDetails') {
			if (form.name !== undefined) name = form.name;
			if (form.email !== undefined) email = form.email;
		}
		if (form?.action === 'updatePassword' && form?.success) {
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		}
	});
</script>

<svelte:head>
	<title>User Details — Stype</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-6 py-8">
	<div class="mb-8">
		<div class="flex items-center gap-2">
			<HugeiconsIcon icon={UserCircleIcon} size={28} class="text-primary" />
			<h1 class="text-3xl font-bold tracking-tight">User Details</h1>
		</div>
		<p class="text-muted-foreground mt-1">Manage your personal details and password.</p>
	</div>

	<div class="space-y-8">
		<!-- Details Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title role="heading" aria-level={2}>Details</Card.Title>
				<Card.Description>View your username and update your display name and email address.</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if form?.action === 'updateDetails'}
					{#if form.success}
						<div
							role="status"
							class="mb-6 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm font-medium text-emerald-500 animate-in fade-in"
						>
							<HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
							<span>{form.message}</span>
						</div>
					{:else if form.message}
						<div
							role="alert"
							class="mb-6 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in"
						>
							<HugeiconsIcon icon={Alert01Icon} size={18} />
							<span>{form.message}</span>
						</div>
					{/if}
				{/if}

				<form method="POST" action="?/updateDetails" class="space-y-4" use:enhance>
					<div class="space-y-2">
						<Label for="username" class="text-sm font-medium">Username</Label>
						<div class="relative">
							<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
								<HugeiconsIcon icon={UserIcon} size={18} />
							</div>
							<Input
								type="text"
								id="username"
								name="username"
								value={data.user.username}
								readonly
								class="h-10 pl-10 bg-muted cursor-not-allowed text-muted-foreground"
							/>
						</div>
						<p class="text-xs text-muted-foreground">Usernames are unique handles and cannot be changed.</p>
					</div>

					<div class="space-y-2">
						<Label for="name" class="text-sm font-medium">Display Name</Label>
						<div class="relative">
							<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
								<HugeiconsIcon icon={UserIcon} size={18} />
							</div>
							<Input
								type="text"
								id="name"
								name="name"
								bind:value={name}
								required
								maxlength={50}
								placeholder="Display name"
								class="h-10 pl-10"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="email" class="text-sm font-medium">Email</Label>
						<div class="relative">
							<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
								<HugeiconsIcon icon={Mail01Icon} size={18} />
							</div>
							<Input
								type="email"
								id="email"
								name="email"
								bind:value={email}
								required
								placeholder="typist@example.com"
								class="h-10 pl-10"
							/>
						</div>
					</div>

					<div class="pt-2">
						<Button type="submit" class="h-10">
							<HugeiconsIcon icon={FloppyDiskIcon} size={18} class="mr-2" />
							Save Details
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>

		<!-- Change Password Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title role="heading" aria-level={2}>Change Password</Card.Title>
				<Card.Description>Update your password to keep your account secure.</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if form?.action === 'updatePassword'}
					{#if form.success}
						<div
							role="status"
							class="mb-6 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm font-medium text-emerald-500 animate-in fade-in"
						>
							<HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
							<span>{form.message}</span>
						</div>
					{:else if form.message}
						<div
							role="alert"
							class="mb-6 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in"
						>
							<HugeiconsIcon icon={Alert01Icon} size={18} />
							<span>{form.message}</span>
						</div>
					{/if}
				{/if}

				<form method="POST" action="?/updatePassword" class="space-y-4" use:enhance>
					<div class="space-y-2">
						<Label for="currentPassword" class="text-sm font-medium">Current Password</Label>
						<div class="relative">
							<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
								<HugeiconsIcon icon={Key01Icon} size={18} />
							</div>
							<Input
								type="password"
								id="currentPassword"
								name="currentPassword"
								bind:value={currentPassword}
								required
								autocomplete="current-password"
								placeholder="Enter current password"
								class="h-10 pl-10"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="newPassword" class="text-sm font-medium">New Password</Label>
						<div class="relative">
							<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
								<HugeiconsIcon icon={Key01Icon} size={18} />
							</div>
							<Input
								type="password"
								id="newPassword"
								name="newPassword"
								bind:value={newPassword}
								required
								minlength={8}
								autocomplete="new-password"
								placeholder="At least 8 characters"
								class="h-10 pl-10"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="confirmPassword" class="text-sm font-medium">Confirm Password</Label>
						<div class="relative">
							<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
								<HugeiconsIcon icon={Key01Icon} size={18} />
							</div>
							<Input
								type="password"
								id="confirmPassword"
								name="confirmPassword"
								bind:value={confirmPassword}
								required
								minlength={8}
								autocomplete="new-password"
								placeholder="Confirm new password"
								class="h-10 pl-10"
							/>
						</div>
					</div>

					<div class="pt-2">
						<Button type="submit" class="h-10">
							<HugeiconsIcon icon={Key01Icon} size={18} class="mr-2" />
							Update Password
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>
