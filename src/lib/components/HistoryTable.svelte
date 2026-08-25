<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Popover from '$lib/components/ui/popover';
	import { Calendar } from '$lib/components/ui/calendar';
	import { DateFormatter, type DateValue, getLocalTimeZone } from '@internationalized/date';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Calendar03Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
	import { cn } from '$lib/utils';

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
	let selectedDate = $state<DateValue | undefined>(undefined);
	let isCalendarOpen = $state(false);
	let currentPage = $state(1);

	const df = new DateFormatter('en-US', {
		dateStyle: 'medium'
	});

	let filterDateString = $derived(
		selectedDate
			? `${selectedDate.year}-${String(selectedDate.month).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`
			: ''
	);

	let filteredRuns = $derived(
		runs.filter((run) => {
			let matchesMode = true;
			if (filterMode === 'passage') matchesMode = run.mode === 'passage';
			if (filterMode === 'timed') matchesMode = run.mode === 'timed';

			let matchesDate = true;
			if (filterDateString) {
				const dateObj = new Date(run.createdAt);
				const runDate =
					dateObj.getFullYear() +
					'-' +
					String(dateObj.getMonth() + 1).padStart(2, '0') +
					'-' +
					String(dateObj.getDate()).padStart(2, '0');
				matchesDate = runDate === filterDateString;
			}

			return matchesMode && matchesDate;
		})
	);

	let paginatedRuns = $derived(filteredRuns.slice((currentPage - 1) * 10, currentPage * 10));

	$effect(() => {
		const totalPages = Math.max(1, Math.ceil(filteredRuns.length / 10));
		if (currentPage > totalPages) {
			currentPage = totalPages;
		}
	});
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
			<Label class="mb-2 block">Filter by Date</Label>
			<div class="flex items-center gap-2">
				<Popover.Root bind:open={isCalendarOpen}>
					<Popover.Trigger
						class={cn(
							buttonVariants({ variant: 'outline' }),
							'w-full sm:w-[220px] justify-start text-left font-normal',
							!selectedDate && 'text-muted-foreground'
						)}
						aria-label="Filter by date"
					>
						<HugeiconsIcon icon={Calendar03Icon} size={16} class="mr-2 shrink-0" />
						{selectedDate ? df.format(selectedDate.toDate(getLocalTimeZone())) : 'Pick a date'}
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0" align="start">
						<Calendar
							type="single"
							bind:value={selectedDate}
							onValueChange={() => {
								isCalendarOpen = false;
							}}
						/>
					</Popover.Content>
				</Popover.Root>

				{#if selectedDate}
					<Button
						variant="ghost"
						size="icon"
						class="h-9 w-9 text-muted-foreground hover:text-foreground"
						aria-label="Clear date filter"
						onclick={() => (selectedDate = undefined)}
					>
						<HugeiconsIcon icon={Cancel01Icon} size={16} />
					</Button>
				{/if}
			</div>
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
			{#each paginatedRuns as run (run.id ?? run.createdAt)}
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

		{#if filteredRuns.length > 10}
			<div class="mt-6">
				<Pagination.Root count={filteredRuns.length} perPage={10} bind:page={currentPage}>
					{#snippet children({ pages, currentPage })}
						<Pagination.Content>
							<Pagination.Item>
								<Pagination.Previous />
							</Pagination.Item>
							{#each pages as page (page.key)}
								{#if page.type === "ellipsis"}
									<Pagination.Item>
										<Pagination.Ellipsis />
									</Pagination.Item>
								{:else}
									<Pagination.Item>
										<Pagination.Link {page} isActive={currentPage === page.value}>
											{page.value}
										</Pagination.Link>
									</Pagination.Item>
								{/if}
							{/each}
							<Pagination.Item>
								<Pagination.Next />
							</Pagination.Item>
						</Pagination.Content>
					{/snippet}
				</Pagination.Root>
			</div>
		{/if}
	{/if}
</div>
