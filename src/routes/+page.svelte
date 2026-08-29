<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
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
	import { viewportLayout } from '$lib/viewport';
	import { syncController } from '$lib/sync';

	let settings = $state<GuestSettings>(DEFAULT_GUEST_SETTINGS);
	let currentPassage = $state<GuestPassage | null>(resolveFallbackPassage());
	let cleanupViewport: (() => void) | null = null;

	let rootStyle = $derived(
		$viewportLayout.visualViewportHeight
			? `height: ${$viewportLayout.visualViewportHeight}px; max-height: ${$viewportLayout.visualViewportHeight}px;`
			: 'height: 100dvh;'
	);

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
		cleanupViewport = viewportLayout.initViewportController();
		settings = await localStore.getSettings();
		const resolved = await resolvePassage(settings.passageLength);
		if (resolved) {
			currentPassage = resolved;
		}
	});

	onDestroy(() => {
		cleanupViewport?.();
	});
</script>

<svelte:head>
	<title>Stype — Minimalist Typing Test</title>
</svelte:head>

<div
	class="flex h-screen h-[100dvh] flex-col overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground"
	style={rootStyle}
>
	<GuestHeader />

	<main
		class="mx-auto flex w-full max-w-5xl flex-1 min-h-0 flex-col items-center overflow-hidden transition-all duration-200 {$viewportLayout.isCompact ? 'pt-2 pb-2 px-3' : 'pt-20 pb-6 px-6'}"
		data-compact={$viewportLayout.isCompact ? 'true' : 'false'}
	>
		{#if currentPassage}
			<TypingEngine
				passage={currentPassage}
				initialMode={settings.mode}
				initialDuration={settings.duration}
				initialZenMode={settings.zenMode}
				initialScrollMode={settings.scrollMode}
				onSave={async (result) => {
					const saved = await localStore.saveTestRun(result);
					if (syncController.getState().account) {
						syncController.sync().catch(() => {});
					}
					return saved as any;
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
