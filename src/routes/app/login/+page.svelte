<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { localStore } from '$lib/localStore';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { KeyboardIcon, UserIcon, Key01Icon, Alert01Icon, LogInIcon, UserCircleIcon } from '@hugeicons/core-free-icons';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import * as Card from '$lib/components/ui/card';

	let { form }: { form: ActionData } = $props();
	
	let username = $state('');
	let password = $state('');
	let isSyncing = $state(false);

	$effect.pre(() => {
		if (form?.username !== undefined) {
			username = form.username;
		}
	});

	function fillCredentials() {
		username = 'admin';
		password = 'admin123';
	}

	function handleLogin() {
		return async ({ result, update }: { result: any; update: () => Promise<void> }) => {
			if (result.type === 'redirect' || result.type === 'success') {
				const guestData = localStore.getGuestData();
				const hasMeaningfulData = guestData.testRuns.length > 0 || guestData.customPassages.length > 0;
				
				if (hasMeaningfulData) {
					isSyncing = true;
					try {
						const res = await fetch('/app/api/sync', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(guestData)
						});
						if (res.ok) {
							localStore.clearGuestData();
						}
					} catch (err) {
						console.error('Failed to sync guest data:', err);
					} finally {
						isSyncing = false;
					}
				}
			}
			await update();
		};
	}
</script>

<svelte:head>
	<title>Login - Stype</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground selection:bg-primary selection:text-primary-foreground">
	<Card.Root class="w-full max-w-md bg-card/60 backdrop-blur">
		<Card.Header class="text-center pt-8 pb-0">
			<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-primary">
				<HugeiconsIcon icon={KeyboardIcon} size={28} />
			</div>
			<Card.Title class="mt-4 text-2xl font-bold tracking-tight">stype</Card.Title>
			<Card.Description class="mt-1 text-sm text-muted-foreground">Distraction-free typing speed test</Card.Description>
		</Card.Header>

		<Card.Content class="pt-8">
			{#if form?.message}
				<div class="mb-6 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					<HugeiconsIcon icon={Alert01Icon} size={20} color="currentColor" />
					<span>{form.message}</span>
				</div>
			{/if}

			<form method="POST" class="space-y-5" use:enhance={handleLogin}>
				<div class="space-y-2">
					<Label for="username" class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Username or Email
					</Label>
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
							<HugeiconsIcon icon={UserIcon} size={18} />
						</div>
						<Input
							type="text"
							id="username"
							name="username"
							bind:value={username}
							required
							autocomplete="username"
							placeholder="Username or email"
							class="h-10 pl-10"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="password" class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Password
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
							autocomplete="current-password"
							placeholder="••••••••"
							class="h-10 pl-10"
						/>
					</div>
				</div>

				<Button
					type="submit"
					class="h-10 w-full"
					disabled={isSyncing}
				>
					<HugeiconsIcon icon={LogInIcon} size={20} />
					<span class="ml-2">{isSyncing ? 'Syncing...' : 'Log in'}</span>
				</Button>
			</form>

			<div class="relative my-6 flex items-center justify-center">
				<div class="absolute inset-0 flex items-center">
					<Separator />
				</div>
				<span class="relative bg-card px-2 text-xs text-muted-foreground">
					or continue without an account
				</span>
			</div>

			<Button
				variant="secondary"
				href="/"
				class="h-10 w-full"
			>
				<HugeiconsIcon icon={UserCircleIcon} size={20} />
				<span class="ml-2">Continue as Guest</span>
			</Button>

			<p class="mt-2 text-center text-xs text-muted-foreground">
				Test runs and settings are saved locally in the browser.
			</p>
		</Card.Content>

		<Card.Footer class="pb-8">
			<div class="w-full rounded-lg border border-border/80 bg-muted/40 p-4 text-center text-xs text-muted-foreground">
				<div class="flex flex-wrap items-center justify-center gap-1.5">
					<span>Default seeded account:</span>
					<button
						type="button"
						class="inline-flex cursor-pointer items-center rounded-md border border-border/60 bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onclick={fillCredentials}
					>
						admin
					</button>
					<span class="text-muted-foreground">/</span>
					<button
						type="button"
						class="inline-flex cursor-pointer items-center rounded-md border border-border/60 bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onclick={fillCredentials}
					>
						admin123
					</button>
				</div>
			</div>
		</Card.Footer>
	</Card.Root>
</div>
