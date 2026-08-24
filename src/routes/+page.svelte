<script lang="ts">
	import type { PageData } from './$types';
	import TypingEngine from '$lib/components/TypingEngine.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Stype — Minimalist Typing Test</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-12">
	{#if data.passage}
		<TypingEngine passage={data.passage} />
	{:else}
		<div class="w-full max-w-2xl text-center space-y-4">
			<h2 class="text-3xl font-bold tracking-tight text-foreground">Ready to type</h2>
			<p class="text-sm text-muted-foreground">
				Welcome back, <span class="font-semibold text-foreground">{data.user?.username}</span>. No passages available.
			</p>
		</div>
	{/if}
</div>

