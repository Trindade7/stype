<script lang="ts">
	import { onMount } from 'svelte';
	import GuestHeader from '$lib/components/GuestHeader.svelte';
	import PerformanceChart from '$lib/components/PerformanceChart.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { localStore, type GuestTestRun } from '$lib/localStore';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { 
		Chart01Icon,
		Activity01Icon,
		CrownIcon,
		BadgeCheckIcon
	} from '@hugeicons/core-free-icons';

	let runs = $state<GuestTestRun[]>(localStore.getTestRuns());

	onMount(() => {
		runs = localStore.getTestRuns();
	});

	let stats = $derived.by(() => {
		const totalTests = runs.length;
		const averageWpm = totalTests > 0 ? runs.reduce((acc, r) => acc + r.wpm, 0) / totalTests : 0;
		const peakWpm = totalTests > 0 ? Math.max(...runs.map((r) => r.wpm)) : 0;
		const averageAccuracy = totalTests > 0 ? runs.reduce((acc, r) => acc + r.accuracy, 0) / totalTests : 0;

		return [
			{
				title: 'Tests Completed',
				value: totalTests,
				icon: Chart01Icon,
				desc: 'Total lifetime runs'
			},
			{
				title: 'Average Speed',
				value: Math.round(averageWpm) + ' WPM',
				icon: Activity01Icon,
				desc: 'All-time average'
			},
			{
				title: 'Peak Speed',
				value: peakWpm + ' WPM',
				icon: CrownIcon,
				desc: 'Personal best'
			},
			{
				title: 'Average Accuracy',
				value: Math.round(averageAccuracy) + '%',
				icon: BadgeCheckIcon,
				desc: 'All-time average'
			}
		];
	});
</script>

<svelte:head>
	<title>Lifetime Stats — Stype</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
	<GuestHeader />

	<main class="container mx-auto max-w-4xl py-10 px-4 sm:px-6 flex-1 mt-[69px]">
		<div class="mb-8">
			<h1 class="text-3xl font-bold tracking-tight mb-2">Lifetime Stats</h1>
			<p class="text-muted-foreground">Your all-time typing performance metrics.</p>
		</div>

		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
			{#each stats as stat}
				<Card>
					<CardHeader class="flex flex-row items-center justify-between pb-2">
						<CardTitle class="text-sm font-medium text-muted-foreground">
							{stat.title}
						</CardTitle>
						{#if stat.icon}
							<HugeiconsIcon icon={stat.icon} size={20} class="text-muted-foreground" />
						{/if}
					</CardHeader>
					<CardContent>
						<div class="text-3xl font-bold">{stat.value}</div>
						<p class="text-xs text-muted-foreground mt-1">{stat.desc}</p>
					</CardContent>
				</Card>
			{/each}
		</div>

		<div class="mt-8">
			<Card>
				<CardHeader>
					<CardTitle class="text-lg font-semibold">Performance Trend</CardTitle>
				</CardHeader>
				<CardContent>
					<PerformanceChart {runs} />
				</CardContent>
			</Card>
		</div>
	</main>
</div>
