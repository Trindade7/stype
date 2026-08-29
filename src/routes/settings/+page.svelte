<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsForm from '$lib/components/SettingsForm.svelte';
	import GuestHeader from '$lib/components/GuestHeader.svelte';
	import { localStore, DEFAULT_GUEST_SETTINGS, type GuestSettings } from '$lib/localStore';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Settings02Icon } from '@hugeicons/core-free-icons';

	let settings = $state<GuestSettings>(DEFAULT_GUEST_SETTINGS);
	let isLoading = $state(true);

	onMount(async () => {
		settings = await localStore.getSettings();
		isLoading = false;
	});
</script>

<svelte:head>
	<title>Settings — Stype</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
	<GuestHeader />

	<main class="mx-auto max-w-5xl px-6 py-8 flex-1 w-full mt-[69px]">
		<div class="mb-8">
			<div class="flex items-center gap-2">
				<HugeiconsIcon icon={Settings02Icon} size={28} class="text-primary" />
				<h1 class="text-3xl font-bold tracking-tight">Settings</h1>
			</div>
			<p class="text-muted-foreground mt-1">Configure your default typing test environment and preferences.</p>
		</div>

		{#if isLoading}
			<div class="py-12 flex justify-center items-center text-muted-foreground" data-testid="settings-loading">
				<div class="animate-pulse text-sm">Loading settings...</div>
			</div>
		{:else}
			<SettingsForm
				{settings}
				onSave={async (newSettings) => {
					settings = await localStore.saveSettings(newSettings);
					return { success: true };
				}}
			/>
		{/if}
	</main>
</div>
