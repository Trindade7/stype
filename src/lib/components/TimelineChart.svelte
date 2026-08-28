<script lang="ts">
	import type { TimelineSnapshot } from '$lib/server/db/schema';

	let { snapshots = [], class: className = '' }: { snapshots?: TimelineSnapshot[]; class?: string } = $props();

	let hoveredIndex = $state<number | null>(null);

	const width = 600;
	const height = 200;
	const padding = { top: 20, right: 45, bottom: 30, left: 45 };

	const plotWidth = $derived(width - padding.left - padding.right);
	const plotHeight = $derived(height - padding.top - padding.bottom);

	const maxWpm = $derived(
		snapshots.length > 0 ? Math.max(40, ...snapshots.map((s) => s.wpm)) : 60
	);

	const yWpmMax = $derived(Math.ceil((maxWpm + 10) / 20) * 20);

	function getX(index: number): number {
		if (snapshots.length <= 1) {
			return padding.left + plotWidth / 2;
		}
		return padding.left + (index / (snapshots.length - 1)) * plotWidth;
	}

	function getYWpm(wpm: number): number {
		const ratio = Math.max(0, Math.min(1, wpm / yWpmMax));
		return padding.top + plotHeight - ratio * plotHeight;
	}

	function getYAcc(accuracy: number): number {
		const ratio = Math.max(0, Math.min(1, accuracy / 100));
		return padding.top + plotHeight - ratio * plotHeight;
	}

	const wpmPoints = $derived(
		snapshots.map((s, i) => ({ x: getX(i), y: getYWpm(s.wpm), snapshot: s }))
	);

	const accPoints = $derived(
		snapshots.map((s, i) => ({ x: getX(i), y: getYAcc(s.accuracy), snapshot: s }))
	);

	const wpmPath = $derived(
		wpmPoints.length > 0
			? wpmPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '')
			: ''
	);

	const wpmAreaPath = $derived(
		wpmPoints.length > 0
			? `${wpmPath} L ${wpmPoints[wpmPoints.length - 1].x.toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} L ${wpmPoints[0].x.toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} Z`
			: ''
	);

	const accPath = $derived(
		accPoints.length > 0
			? accPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '')
			: ''
	);

	const gridLevels = [0, 0.25, 0.5, 0.75, 1];

	const activeSnapshot = $derived(
		hoveredIndex !== null && snapshots[hoveredIndex] ? snapshots[hoveredIndex] : null
	);
</script>

<div class="w-full flex flex-col gap-3 {className}">
	<!-- Header / Legend -->
	<div class="flex items-center justify-between px-1 text-xs font-semibold">
		<div class="flex items-center gap-5">
			<div class="flex items-center gap-2">
				<span class="inline-block h-2.5 w-2.5 rounded-full bg-success"></span>
				<span class="text-foreground">Speed (WPM)</span>
			</div>
			<div class="flex items-center gap-2">
				<span class="inline-block h-2.5 w-2.5 rounded-full bg-chart-2"></span>
				<span class="text-muted-foreground">Accuracy (%)</span>
			</div>
		</div>

		{#if activeSnapshot}
			<div class="flex items-center gap-4 font-mono text-xs bg-muted px-2.5 py-1 rounded border border-border animate-in fade-in duration-150">
				<span class="text-muted-foreground">{activeSnapshot.second}s</span>
				<span class="text-success font-bold">{activeSnapshot.wpm} WPM</span>
				<span class="text-chart-2 font-bold">{activeSnapshot.accuracy}%</span>
			</div>
		{/if}
	</div>

	{#if snapshots.length === 0}
		<div class="flex h-48 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground font-mono">
			No timeline data available
		</div>
	{:else}
		<!-- Chart Container -->
		<div class="relative w-full rounded-lg bg-card p-2 border border-border overflow-hidden">
			<svg
				viewBox="0 0 {width} {height}"
				class="w-full h-auto overflow-visible select-none"
			>
				<defs>
					<linearGradient id="wpm-area-gradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="var(--color-success)" stop-opacity="0.25" />
						<stop offset="100%" stop-color="var(--color-success)" stop-opacity="0.0" />
					</linearGradient>
				</defs>

				<!-- Grid Lines and Y-axis Labels -->
				{#each gridLevels as level}
					{@const y = padding.top + plotHeight * (1 - level)}
					{@const wpmVal = Math.round(yWpmMax * level)}
					{@const accVal = Math.round(100 * level)}
					<line
						x1={padding.left}
						y1={y}
						x2={width - padding.right}
						y2={y}
						stroke="currentColor"
						class="text-border stroke-1"
						stroke-dasharray={level === 0 ? undefined : '3,3'}
					/>
					<!-- Left Label: WPM -->
					<text
						x={padding.left - 8}
						y={y + 3}
						text-anchor="end"
						class="fill-muted-foreground font-mono text-[10px]"
					>
						{wpmVal}
					</text>
					<!-- Right Label: Accuracy -->
					<text
						x={width - padding.right + 8}
						y={y + 3}
						text-anchor="start"
						class="fill-muted-foreground font-mono text-[10px]"
					>
						{accVal}%
					</text>
				{/each}

				<!-- Area under WPM curve -->
				{#if wpmAreaPath}
					<path d={wpmAreaPath} fill="url(#wpm-area-gradient)" />
				{/if}

				<!-- Accuracy Line -->
				{#if accPath}
					<path
						data-testid="accuracy-line"
						d={accPath}
						fill="none"
						stroke="currentColor"
						class="text-chart-2 stroke-chart-2 stroke-2"
						stroke-linejoin="round"
						stroke-linecap="round"
						opacity="0.75"
					/>
				{/if}

				<!-- Speed (WPM) Line -->
				{#if wpmPath}
					<path
						data-testid="wpm-line"
						d={wpmPath}
						fill="none"
						stroke="currentColor"
						class="text-success stroke-success stroke-[2.5]"
						stroke-linejoin="round"
						stroke-linecap="round"
					/>
				{/if}

				<!-- Hover Guide Line -->
				{#if hoveredIndex !== null && wpmPoints[hoveredIndex]}
					<line
						x1={wpmPoints[hoveredIndex].x}
						y1={padding.top}
						x2={wpmPoints[hoveredIndex].x}
						y2={padding.top + plotHeight}
						stroke="currentColor"
						class="text-muted-foreground"
						stroke-width="1"
						stroke-dasharray="2,2"
						opacity="0.6"
					/>
				{/if}

				<!-- Data Points -->
				{#each accPoints as pt, i}
					<circle
						cx={pt.x}
						cy={pt.y}
						r={hoveredIndex === i ? 4 : 2.5}
						fill="currentColor"
						class="text-chart-2 fill-chart-2 transition-all duration-150"
					/>
				{/each}

				{#each wpmPoints as pt, i}
					<circle
						cx={pt.x}
						cy={pt.y}
						r={hoveredIndex === i ? 5 : 3}
						fill="currentColor"
						class="text-success fill-success transition-all duration-150"
					/>
				{/each}

				<!-- X-axis Labels (Seconds) -->
				{#each snapshots as snap, i}
					{@const showLabel =
						snapshots.length <= 10 ||
						i === 0 ||
						i === snapshots.length - 1 ||
						(snapshots.length <= 30 && i % 5 === 0) ||
						(snapshots.length > 30 && i % 10 === 0)}
					{#if showLabel}
						<text
							x={getX(i)}
							y={height - 8}
							text-anchor="middle"
							class="fill-muted-foreground font-mono text-[10px]"
						>
							{snap.second}s
						</text>
					{/if}
				{/each}

				<!-- Transparent Hover Slices -->
				{#each snapshots as snap, i}
					{@const sliceWidth =
						snapshots.length <= 1 ? plotWidth : plotWidth / (snapshots.length - 1)}
					{@const sliceX =
						snapshots.length <= 1
							? padding.left
							: Math.max(padding.left, getX(i) - sliceWidth / 2)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<rect
						data-testid="hover-trigger"
						x={sliceX}
						y={padding.top}
						width={sliceWidth}
						height={plotHeight}
						fill="transparent"
						class="cursor-pointer"
						onmouseenter={() => (hoveredIndex = i)}
						onmouseleave={() => (hoveredIndex = null)}
					/>
				{/each}
			</svg>
		</div>
	{/if}
</div>
