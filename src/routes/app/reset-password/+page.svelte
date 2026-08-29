<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { localStore } from '$lib/localStore';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		KeyboardIcon,
		Key01Icon,
		Alert01Icon,
		ArrowLeft01Icon,
		LockPasswordIcon,
		Mail01Icon
	} from '@hugeicons/core-free-icons';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let password = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);

	let isInvalidToken = $derived(!data.valid || Boolean(form?.invalidToken));
	let tokenErrorMessage = $derived(
		form?.invalidToken
			? form.message
			: data.error || 'This password reset link is invalid or has expired. Please request a new reset link.'
	);

	function handleResetPassword() {
		isSubmitting = true;
		return async ({ result, update }: { result: any; update: () => Promise<void> }) => {
			try {
				if (result.type === 'redirect' || result.type === 'success') {
					const guestData = await localStore.getGuestData();
					const hasMeaningfulData = guestData.testRuns.length > 0 || guestData.customPassages.length > 0;

					if (hasMeaningfulData) {
						try {
							const res = await fetch('/app/api/sync', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify(guestData)
							});
							if (res.ok) {
								await localStore.clearGuestData();
							}
						} catch (err) {
							console.error('Failed to sync guest data:', err);
						}
					}
				}
				await update();
			} finally {
				isSubmitting = false;
			}
		};
	}
</script>

<svelte:head>
	<title>Reset Password - Stype</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground selection:bg-primary selection:text-primary-foreground">
	<Card.Root class="w-full max-w-md bg-card/60 backdrop-blur">
		<Card.Header class="text-center pt-8 pb-0">
			<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-primary">
				<HugeiconsIcon icon={KeyboardIcon} size={28} />
			</div>
			<Card.Title class="mt-4 text-2xl font-bold tracking-tight">stype</Card.Title>
			<Card.Description class="mt-1 text-sm text-muted-foreground">
				{isInvalidToken ? 'Password reset unavailable' : 'Set your new password'}
			</Card.Description>
		</Card.Header>

		<Card.Content class="pt-8">
			{#if isInvalidToken}
				<div class="space-y-6">
					<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
						<div class="flex items-start gap-3">
							<HugeiconsIcon icon={Alert01Icon} size={20} class="shrink-0 mt-0.5" />
							<div>
								<p class="font-medium">Invalid or Expired Link</p>
								<p class="mt-1 text-xs text-muted-foreground leading-relaxed">
									{tokenErrorMessage}
								</p>
							</div>
						</div>
					</div>

					<Button
						href="/app/forgot-password"
						class="h-10 w-full"
					>
						<HugeiconsIcon icon={Mail01Icon} size={18} />
						<span class="ml-2">Request a new link</span>
					</Button>

					<div class="text-center text-sm text-muted-foreground">
						<a href="/app/login" class="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
							<HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
							<span>Back to login</span>
						</a>
					</div>
				</div>
			{:else}
				{#if form?.message && !form?.invalidToken}
					<div class="mb-6 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						<HugeiconsIcon icon={Alert01Icon} size={20} color="currentColor" />
						<span>{form.message}</span>
					</div>
				{/if}

				<form method="POST" class="space-y-4" use:enhance={handleResetPassword}>
					<input type="hidden" name="token" value={data.token} />

					<div class="space-y-2">
						<Label for="password" class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							New Password
						</Label>
						<div class="relative">
							<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
								<HugeiconsIcon icon={Key01Icon} size={18} />
							</div>
							<Input
								type="password"
								id="password"
								name="password"
								bind:value={password}
								required
								autocomplete="new-password"
								placeholder="At least 8 characters"
								minlength={8}
								class="h-10 pl-10"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="confirmPassword" class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Confirm New Password
						</Label>
						<div class="relative">
							<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
								<HugeiconsIcon icon={LockPasswordIcon} size={18} />
							</div>
							<Input
								type="password"
								id="confirmPassword"
								name="confirmPassword"
								bind:value={confirmPassword}
								required
								autocomplete="new-password"
								placeholder="Repeat new password"
								minlength={8}
								class="h-10 pl-10"
							/>
						</div>
					</div>

					<Button
						type="submit"
						class="h-10 w-full"
						disabled={isSubmitting}
					>
						<HugeiconsIcon icon={Key01Icon} size={20} />
						<span class="ml-2">{isSubmitting ? 'Resetting password...' : 'Reset password'}</span>
					</Button>
				</form>

				<div class="mt-6 text-center text-sm text-muted-foreground">
					Remember your password?{' '}
					<a href="/app/login" class="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
						<HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
						<span>Back to login</span>
					</a>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
