<script lang="ts">
	import { onMount } from 'svelte';
	import TypingEngine from '$lib/components/TypingEngine.svelte';
	import GuestHeader from '$lib/components/GuestHeader.svelte';
	import { localStore, type GuestPassage, type GuestSettings } from '$lib/localStore';
	import { getPassageIdFromUrl, clearPassageQuery } from '$lib/passage-utils';

	let settings = $state<GuestSettings>(localStore.getSettings());

	function resolveInitialPassage(lengthFilter = settings.passageLength): GuestPassage | null {
		const targetId = getPassageIdFromUrl();
		if (targetId !== null) {
			const found = localStore.getPassageById(targetId);
			if (found) return found;
		}
		return localStore.getRandomPassage(lengthFilter);
	}

	let currentPassage = $state<GuestPassage | null>(
		resolveInitialPassage(localStore.getSettings().passageLength)
	);

	function loadNextPassage() {
		clearPassageQuery();
		currentPassage = localStore.getRandomPassage(settings.passageLength);
	}

	onMount(() => {
		settings = localStore.getSettings();
		if (!currentPassage) {
			currentPassage = resolveInitialPassage(settings.passageLength);
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
				initialScrollMode={settings.scrollMode}
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
