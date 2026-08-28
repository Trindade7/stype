<script lang="ts">
	import type { PageData } from './$types';
	import PerformanceChart from '$lib/components/PerformanceChart.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { 
		Chart01Icon,
		Activity01Icon,
		CrownIcon,
		BadgeCheckIcon
	} from '@hugeicons/core-free-icons';

	let { data }: { data: PageData } = $props();

	let stats = $derived([
		{
			title: 'Tests Completed',
			value: data.stats.totalTests,
			icon: Chart01Icon,
			desc: 'Total lifetime runs'
		},
		{
			title: 'Average Speed',
			value: Math.round(data.stats.averageWpm) + ' WPM',
			icon: Activity01Icon,
			desc: 'All-time average'
		},
		{
			title: 'Peak Speed',
			value: data.stats.peakWpm + ' WPM',
			icon: CrownIcon,
			desc: 'Personal best'
		},
		{
			title: 'Average Accuracy',
			value: Math.round(data.stats.averageAccuracy) + '%',
			icon: BadgeCheckIcon,
			desc: 'All-time average'
		}
	]);
</script>

<svelte:head>
	<title>Lifetime Stats - Stype</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-6 py-8 w-full">
	<div class="mb-8">
		<h1 class="text-3xl font-bold tracking-tight mb-2">Lifetime Stats</h1>
		<p class="text-muted-foreground">Your all-time typing performance metrics.</p>
	</div>

	<div class="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
		{#each stats as stat}
			<Card>
				<CardHeader class="flex flex-row items-center justify-between pb-2">
					<CardTitle class="text-sm font-medium text-muted-foreground">
						{stat.title}
					</CardTitle>
					{#if stat.icon}
						<HugeiconsIcon icon={stat.icon} size={20} class="text-muted-foreground shrink-0" />
					{/if}
				</CardHeader>
				<CardContent>
					<div class="text-2xl sm:text-3xl font-bold">{stat.value}</div>
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
				<PerformanceChart runs={data.runs} />
			</CardContent>
		</Card>
	</div>
</div>
