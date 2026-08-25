<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';

	export interface HistoryRunItem {
		id?: number | string;
		mode: 'passage' | 'timed' | string;
		duration?: number | null;
		wpm: number;
		accuracy: number;
		createdAt: string | Date | number;
		timeElapsed: number;
		passage?: {
			source?: string | null;
			text?: string | null;
		} | null;
	}

	let { runs = [] }: { runs?: HistoryRunItem[] } = $props();

	let filterMode = $state<string>('all');
	let filterDate = $state<string>('');

	let filteredRuns = $derived(
		runs.filter((run) => {
			let matchesMode = true;
			if (filterMode === 'passage') matchesMode = run.mode === 'passage';
			if (filterMode === 'timed') matchesMode = run.mode === 'timed';

			let matchesDate = true;
			if (filterDate) {
				const dateObj = new Date(run.createdAt);
				const runDate =
					dateObj.getFullYear() +
					'-' +
					String(dateObj.getMonth() + 1).padStart(2, '0') +
					'-' +
					String(dateObj.getDate()).padStart(2, '0');
				matchesDate = runDate === filterDate;
			}

			return matchesMode && matchesDate;
		})
	);
</script>

<div class="w-full">
	<div class="mb-6 flex flex-col sm:flex-row gap-4 items-end">
		<div class="w-full sm:w-48">
			<Label class="mb-2 block">Test Mode</Label>
			<Tabs.Root value={filterMode} onValueChange={(v) => (filterMode = v)} class="w-full">
				<Tabs.List class="w-full">
					<Tabs.Trigger value="all" class="flex-1">All</Tabs.Trigger>
					<Tabs.Trigger value="passage" class="flex-1">Passage</Tabs.Trigger>
					<Tabs.Trigger value="timed" class="flex-1">Timed</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		</div>

		<div class="w-full sm:w-auto">
			<Label for="dateFilter" class="mb-2 block">Filter by Date</Label>
			<Input type="date" id="dateFilter" bind:value={filterDate} class="w-full sm:w-[200px]" />
		</div>
	</div>

	{#if filteredRuns.length === 0}
		<Card class="bg-muted/40">
			<CardContent class="py-10 text-center">
				<p class="text-muted-foreground">No test runs found matching your filters.</p>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-4">
			{#each filteredRuns as run (run.id ?? run.createdAt)}
				<Card>
					<CardContent class="p-6">
						<div class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
							<div>
								<div class="flex items-center gap-2 mb-1">
									<h3 class="text-lg font-semibold">{run.wpm} WPM</h3>
									<span class="text-sm font-medium text-muted-foreground">• {run.accuracy}% Acc</span>
									<span class="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium uppercase tracking-wider">
										{run.mode}
									</span>
								</div>
								<div class="text-sm text-muted-foreground flex items-center gap-2">
									<span>{new Date(run.createdAt).toLocaleString(undefined, {
										year: 'numeric',
										month: 'short',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit'
									})}</span>
									<span>•</span>
									<span>{run.timeElapsed}s</span>
								</div>
							</div>

							{#if run.passage?.source}
								<div class="text-sm text-right sm:max-w-[200px] text-muted-foreground italic truncate">
									{run.passage.source}
								</div>
							{/if}
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>
