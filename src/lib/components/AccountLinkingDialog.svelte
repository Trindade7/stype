<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { syncController } from '$lib/sync';
	import { detectDefaultServerUrl } from '$lib/sync/pocketbase-backend';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		CloudIcon,
		CloudUploadIcon,
		CheckmarkCircle02Icon,
		AlertCircleIcon,
		Loading03Icon,
		Link01Icon,
		LinkBackwardIcon,
		UserCircleIcon
	} from '@hugeicons/core-free-icons';

	let {
		open = $bindable(false),
		trigger,
		defaultServerUrl = ''
	}: {
		open?: boolean;
		trigger?: Snippet;
		defaultServerUrl?: string;
	} = $props();

	let activeTab = $state<'login' | 'register'>('login');
	let serverUrl = $state('');
	let identifier = $state('');
	let password = $state('');

	let regUsername = $state('');
	let regEmail = $state('');
	let regPassword = $state('');
	let regConfirmPassword = $state('');
	let regName = $state('');

	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const syncState = $derived($syncController);
	const isLinked = $derived(!!syncState.account);

	async function checkDefaultOrigin() {
		if (!serverUrl) {
			if (defaultServerUrl) {
				serverUrl = defaultServerUrl;
				return;
			}
			const detected = await detectDefaultServerUrl();
			if (detected && !serverUrl) {
				serverUrl = detected;
			}
		}
	}

	onMount(() => {
		checkDefaultOrigin();
	});

	$effect(() => {
		if (open) {
			checkDefaultOrigin();
		}
	});

	function formatLastSynced(timestamp: string | null): string {
		if (!timestamp) return 'Never synced';
		const date = new Date(timestamp);
		if (isNaN(date.getTime())) return 'Never synced';
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}

	async function handleLink(e: SubmitEvent) {
		e.preventDefault();
		errorMessage = null;
		isSubmitting = true;

		try {
			await syncController.linkAccount(serverUrl, identifier, password);
			password = '';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to link account';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleRegister(e: SubmitEvent) {
		e.preventDefault();
		errorMessage = null;

		if (regPassword !== regConfirmPassword) {
			errorMessage = 'Passwords do not match';
			return;
		}

		if (regPassword.length < 8) {
			errorMessage = 'Password must be at least 8 characters';
			return;
		}

		isSubmitting = true;

		try {
			await syncController.registerAccount(serverUrl, {
				username: regUsername,
				password: regPassword,
				email: regEmail.trim() || undefined,
				name: regName.trim() || undefined
			});
			regPassword = '';
			regConfirmPassword = '';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to register account';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleSyncNow() {
		errorMessage = null;
		const res = await syncController.sync();
		if (!res.success && res.error) {
			errorMessage = res.error;
		}
	}

	async function handleUnlink() {
		errorMessage = null;
		await syncController.unlinkAccount();
		serverUrl = '';
		identifier = '';
		password = '';
		regUsername = '';
		regEmail = '';
		regPassword = '';
		regConfirmPassword = '';
		regName = '';
	}
</script>

<Dialog.Root bind:open>
	{#if trigger}
		{@render trigger()}
	{/if}

	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<HugeiconsIcon icon={CloudIcon} size={20} class="text-primary" />
				<span>{isLinked ? 'Server Synchronization' : 'Link Server Account'}</span>
			</Dialog.Title>
			<Dialog.Description>
				{isLinked
					? 'Your practice history, custom passages, and settings are syncing with your self-hosted Stype server.'
					: 'Enter your self-hosted Stype server URL and credentials to synchronize your typing data across devices.'}
			</Dialog.Description>
		</Dialog.Header>

		{#if errorMessage}
			<div class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
				<HugeiconsIcon icon={AlertCircleIcon} size={18} class="shrink-0" />
				<span>{errorMessage}</span>
			</div>
		{/if}

		{#if isLinked && syncState.account}
			<div class="space-y-4 py-2">
				<div class="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground font-medium">Linked to:</span>
						<span class="font-semibold text-foreground truncate max-w-[220px]" title={syncState.account.serverUrl}>
							{syncState.account.serverUrl}
						</span>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground font-medium">Account:</span>
						<span class="font-medium text-foreground flex items-center gap-1.5">
							<HugeiconsIcon icon={UserCircleIcon} size={16} />
							{syncState.account.user.username}
						</span>
					</div>
					<div class="flex items-center justify-between text-sm pt-1 border-t border-border">
						<span class="text-muted-foreground">Status:</span>
						{#if syncState.status === 'syncing'}
							<span class="text-primary flex items-center gap-1 font-medium">
								<HugeiconsIcon icon={Loading03Icon} size={14} class="animate-spin" />
								Syncing...
							</span>
						{:else if syncState.status === 'offline'}
							<span class="text-amber-500 font-medium">Offline (will retry)</span>
						{:else if syncState.status === 'error'}
							<span class="text-destructive font-medium">Sync error</span>
						{:else}
							<span class="text-muted-foreground flex items-center gap-1">
								<HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} class="text-emerald-500" />
								Synced {formatLastSynced(syncState.lastSyncedAt)}
							</span>
						{/if}
					</div>
				</div>

				<Dialog.Footer class="flex sm:justify-between items-center gap-2 pt-2">
					<Button
						type="button"
						variant="outline"
						onclick={handleUnlink}
						class="text-destructive hover:text-destructive"
					>
						<HugeiconsIcon icon={LinkBackwardIcon} size={16} class="mr-1.5" />
						Unlink Account
					</Button>
					<Button
						type="button"
						onclick={handleSyncNow}
						disabled={syncState.status === 'syncing'}
					>
						<HugeiconsIcon icon={CloudUploadIcon} size={16} class="mr-1.5" />
						Sync Now
					</Button>
				</Dialog.Footer>
			</div>
		{:else}
			<div class="space-y-4 py-2">
				<div class="space-y-2">
					<Label for="server-url">Server URL</Label>
					<Input
						id="server-url"
						type="url"
						placeholder="https://stype.example.com"
						bind:value={serverUrl}
						required
					/>
				</div>

				<Tabs.Root
					value={activeTab}
					onValueChange={(val) => {
						activeTab = val as 'login' | 'register';
						errorMessage = null;
					}}
					class="w-full"
				>
					<Tabs.List class="grid w-full grid-cols-2">
						<Tabs.Trigger value="login">Log In</Tabs.Trigger>
						<Tabs.Trigger value="register">Register</Tabs.Trigger>
					</Tabs.List>

					{#if activeTab === 'login'}
						<Tabs.Content value="login">
							<form onsubmit={handleLink} class="space-y-4 pt-2">
								<div class="space-y-2">
									<Label for="sync-identifier">Username or Email</Label>
									<Input
										id="sync-identifier"
										type="text"
										placeholder="username or user@example.com"
										bind:value={identifier}
										required
										autocomplete="username"
									/>
								</div>

								<div class="space-y-2">
									<Label for="sync-password">Password</Label>
									<Input
										id="sync-password"
										type="password"
										placeholder="••••••••"
										bind:value={password}
										required
										autocomplete="current-password"
									/>
								</div>

								<Dialog.Footer class="pt-2">
									<Button type="submit" class="w-full" disabled={isSubmitting}>
										{#if isSubmitting}
											<HugeiconsIcon icon={Loading03Icon} size={16} class="mr-2 animate-spin" />
											Connecting...
										{:else}
											<HugeiconsIcon icon={Link01Icon} size={16} class="mr-2" />
											Link Account
										{/if}
									</Button>
								</Dialog.Footer>
							</form>
						</Tabs.Content>
					{:else}
						<Tabs.Content value="register">
							<form onsubmit={handleRegister} class="space-y-4 pt-2">
								<div class="space-y-2">
									<Label for="register-username">Username</Label>
									<Input
										id="register-username"
										type="text"
										placeholder="protypist"
										bind:value={regUsername}
										required
										autocomplete="username"
									/>
								</div>

								<div class="space-y-2">
									<Label for="register-email">Email (optional)</Label>
									<Input
										id="register-email"
										type="email"
										placeholder="typist@example.com"
										bind:value={regEmail}
										autocomplete="email"
									/>
								</div>

								<div class="space-y-2">
									<Label for="register-password">Password</Label>
									<Input
										id="register-password"
										type="password"
										placeholder="••••••••"
										bind:value={regPassword}
										required
										autocomplete="new-password"
									/>
								</div>

								<div class="space-y-2">
									<Label for="register-password-confirm">Confirm Password</Label>
									<Input
										id="register-password-confirm"
										type="password"
										placeholder="••••••••"
										bind:value={regConfirmPassword}
										required
										autocomplete="new-password"
									/>
								</div>

								<Dialog.Footer class="pt-2">
									<Button type="submit" class="w-full" disabled={isSubmitting}>
										{#if isSubmitting}
											<HugeiconsIcon icon={Loading03Icon} size={16} class="mr-2 animate-spin" />
											Registering...
										{:else}
											<HugeiconsIcon icon={Link01Icon} size={16} class="mr-2" />
											Create Account
										{/if}
									</Button>
								</Dialog.Footer>
							</form>
						</Tabs.Content>
					{/if}
				</Tabs.Root>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
