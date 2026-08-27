<script lang="ts">
	import { onMount } from 'svelte';
	import TypingEngine from '$lib/components/TypingEngine.svelte';
	import GuestHeader from '$lib/components/GuestHeader.svelte';
	import { localStore, type GuestPassage, type GuestSettings } from '$lib/localStore';

	let settings = $state<GuestSettings>(localStore.getSettings());
	let currentPassage = $state<GuestPassage | null>(
		localStore.getRandomPassage(localStore.getSettings().passageLength)
	);

	function loadNextPassage() {
		currentPassage = localStore.getRandomPassage(settings.passageLength);
	}

	onMount(() => {
		settings = localStore.getSettings();
		if (!currentPassage) {
			loadNextPassage();
		}
	});
</script>

<svelte:head>
	<title>Stype — Minimalist Typing Test</title>
</svelte:head>

<div class="flex h-screen h-[100dvh] flex-col overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
	<GuestHeader />

	<main class="mx-auto flex w-full max-w-5xl flex-1 min-h-0 flex-col items-center px-6 pt-20 pb-6 overflow-hidden">
		{#if currentPassage}
			<TypingEngine
				passage={currentPassage}
				initialMode={settings.mode}
				initialDuration={settings.duration}
				initialZenMode={settings.zenMode}
				onSave={(result) => {
					return localStore.saveTestRun(result) as any;
				}}
				onNextPassage={() => {
					loadNextPassage();
				}}
			/>
		{:else}
			<div class="w-full max-w-2xl text-center space-y-4 pt-12">
				<h2 class="text-3xl font-bold tracking-tight text-foreground">Ready to type</h2>
				<p class="text-sm text-muted-foreground">
					No passages available.
				</p>
			</div>
		{/if}
	</main>
</div>
