<script lang="ts">
	import type { PageData } from './$types';
	import HistoryTable from '$lib/components/HistoryTable.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Test History - Stype</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-6 py-8 w-full">
	<div class="mb-8">
		<h1 class="text-3xl font-bold tracking-tight mb-2">Test History</h1>
		<p class="text-muted-foreground">Review your past test runs and see how you've improved.</p>
	</div>

	<HistoryTable runs={data.runs} />
</div>
