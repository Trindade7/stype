<script lang="ts">
	import { onMount } from 'svelte';
	import TypingEngine from '$lib/components/TypingEngine.svelte';
	import GuestHeader from '$lib/components/GuestHeader.svelte';
	import {
		localStore,
		DEFAULT_GUEST_SETTINGS,
		DEFAULT_PASSAGES,
		type GuestPassage,
		type GuestSettings
	} from '$lib/localStore';
	import { getPassageIdFromUrl, clearPassageQuery, filterPassagesByLength } from '$lib/passage-utils';

	let settings = $state<GuestSettings>(DEFAULT_GUEST_SETTINGS);
	let currentPassage = $state<GuestPassage | null>(resolveFallbackPassage());

	function resolveFallbackPassage(): GuestPassage | null {
		const targetId = getPassageIdFromUrl();
		if (targetId !== null) {
			const found = DEFAULT_PASSAGES.find((p) => p.id === targetId);
			if (found) return found;
		}
		const filtered = filterPassagesByLength([...DEFAULT_PASSAGES], DEFAULT_GUEST_SETTINGS.passageLength);
		return filtered[0] ?? DEFAULT_PASSAGES[0];
	}

	async function resolvePassage(lengthFilter = settings.passageLength): Promise<GuestPassage | null> {
		const targetId = getPassageIdFromUrl();
		if (targetId !== null) {
			const found = await localStore.getPassageById(targetId);
			if (found) return found;
		}
		return localStore.getRandomPassage(lengthFilter);
	}

	async function loadNextPassage() {
		clearPassageQuery();
		currentPassage = await localStore.getRandomPassage(settings.passageLength);
	}

	onMount(async () => {
		settings = await localStore.getSettings();
		const resolved = await resolvePassage(settings.passageLength);
		if (resolved) {
			currentPassage = resolved;
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
