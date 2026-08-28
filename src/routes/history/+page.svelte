<script lang="ts">
	import { onMount } from 'svelte';
	import HistoryTable from '$lib/components/HistoryTable.svelte';
	import GuestHeader from '$lib/components/GuestHeader.svelte';
	import { localStore, type GuestTestRun } from '$lib/localStore';

	let runs = $state<GuestTestRun[]>(localStore.getTestRuns());

	onMount(() => {
		runs = localStore.getTestRuns();
	});
</script>

<svelte:head>
	<title>Test History — Stype</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
	<GuestHeader />

	<main class="mx-auto max-w-5xl px-6 py-8 flex-1 w-full mt-[69px]">
		<div class="mb-8">
			<h1 class="text-3xl font-bold tracking-tight mb-2">Test History</h1>
			<p class="text-muted-foreground">Review your past test runs and see how you've improved.</p>
		</div>

		<HistoryTable {runs} />
	</main>
</div>
