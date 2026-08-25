<script lang="ts" module>
	export interface PerformanceRun {
		id?: number | string;
		wpm: number;
		accuracy: number;
		mode?: 'passage' | 'timed' | string;
		createdAt: string | Date | number;
		duration?: number | null;
		timeElapsed?: number;
	}
</script>

<script lang="ts">
	let {
		runs = [],
		class: className = ''
	}: {
		runs?: PerformanceRun[];
		class?: string;
	} = $props();

	let hoveredIndex = $state<number | null>(null);

	const sortedRuns = $derived(
		[...runs].sort((a, b) => {
			const timeA = new Date(a.createdAt).getTime();
			const timeB = new Date(b.createdAt).getTime();
			if (timeA !== timeB) return timeA - timeB;
			const idA = Number(a.id ?? 0);
			const idB = Number(b.id ?? 0);
			return idA - idB;
		})
	);

	const width = 600;
	const height = 220;
	const padding = { top: 20, right: 45, bottom: 35, left: 45 };

	const plotWidth = $derived(width - padding.left - padding.right);
	const plotHeight = $derived(height - padding.top - padding.bottom);

	const maxWpm = $derived(
		sortedRuns.length > 0 ? Math.max(40, ...sortedRuns.map((r) => r.wpm)) : 60
	);

	const yWpmMax = $derived(Math.ceil((maxWpm + 10) / 20) * 20);

	function getX(index: number): number {
		if (sortedRuns.length <= 1) {
			return padding.left + plotWidth / 2;
		}
		return padding.left + (index / (sortedRuns.length - 1)) * plotWidth;
	}

	function getYWpm(wpm: number): number {
		const ratio = Math.max(0, Math.min(1, wpm / yWpmMax));
		return padding.top + plotHeight - ratio * plotHeight;
	}

	function getYAcc(accuracy: number): number {
		const ratio = Math.max(0, Math.min(1, accuracy / 100));
		return padding.top + plotHeight - ratio * plotHeight;
	}

	function formatDate(val: string | Date | number): string {
		const d = new Date(val);
		if (isNaN(d.getTime())) return '';
		return d.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatShortDate(val: string | Date | number): string {
		const d = new Date(val);
		if (isNaN(d.getTime())) return '';
		return d.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric'
		});
	}

	function formatMode(mode?: string): string {
		if (!mode) return 'Passage';
		return mode.charAt(0).toUpperCase() + mode.slice(1);
	}

	function getSliceBounds(index: number, total: number): { x: number; width: number } {
		if (total <= 1) {
			return { x: padding.left, width: plotWidth };
		}
		const prevX = index === 0 ? padding.left : (getX(index - 1) + getX(index)) / 2;
		const nextX =
			index === total - 1 ? padding.left + plotWidth : (getX(index) + getX(index + 1)) / 2;
		return { x: prevX, width: Math.max(0, nextX - prevX) };
	}

	const wpmPoints = $derived(
		sortedRuns.map((r, i) => ({ x: getX(i), y: getYWpm(r.wpm), run: r }))
	);

	const accPoints = $derived(
		sortedRuns.map((r, i) => ({ x: getX(i), y: getYAcc(r.accuracy), run: r }))
	);

	const wpmPath = $derived(
		wpmPoints.length > 0
			? wpmPoints.reduce(
					(acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
					''
				)
			: ''
	);

	const wpmAreaPath = $derived(
		wpmPoints.length > 0
			? `${wpmPath} L ${wpmPoints[wpmPoints.length - 1].x.toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} L ${wpmPoints[0].x.toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} Z`
			: ''
	);

	const accPath = $derived(
		accPoints.length > 0
			? accPoints.reduce(
					(acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
					''
				)
			: ''
	);

	const gridLevels = [0, 0.25, 0.5, 0.75, 1];

	const activeRun = $derived(
		hoveredIndex !== null && sortedRuns[hoveredIndex] ? sortedRuns[hoveredIndex] : null
	);
</script>

<div class="w-full flex flex-col gap-3 {className}">
	<!-- Header / Legend & Tooltip Summary -->
	<div class="flex items-center justify-between px-1 text-xs font-semibold">
		<div class="flex items-center gap-5">
			<div class="flex items-center gap-2">
				<span class="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
				<span class="text-foreground">Speed (WPM)</span>
			</div>
			<div class="flex items-center gap-2">
				<span class="inline-block h-2.5 w-2.5 rounded-full bg-sky-500"></span>
				<span class="text-muted-foreground">Accuracy (%)</span>
			</div>
		</div>

		{#if activeRun}
			<div
				data-testid="performance-tooltip"
				class="flex items-center gap-3 font-mono text-xs bg-muted px-2.5 py-1 rounded border border-border animate-in fade-in duration-150"
			>
				<span class="text-muted-foreground text-[11px]">{formatDate(activeRun.createdAt)}</span>
				<span class="text-xs font-medium px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground uppercase">
					{formatMode(activeRun.mode)}
				</span>
				<span class="text-emerald-500 dark:text-emerald-400 font-bold">{activeRun.wpm} WPM</span>
				<span class="text-sky-500 dark:text-sky-400 font-bold">{activeRun.accuracy}%</span>
			</div>
		{/if}
	</div>

	{#if sortedRuns.length === 0}
		<div
			data-testid="performance-chart-empty"
			class="flex h-48 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground font-mono"
		>
			No test runs yet. Complete a typing test to see your performance trend.
		</div>
	{:else}
		<!-- Chart Container -->
		<div class="relative w-full rounded-lg bg-card p-2 border border-border overflow-hidden">
			<svg
				viewBox="0 0 {width} {height}"
				class="w-full h-auto overflow-visible select-none"
			>
				<defs>
					<linearGradient id="perf-wpm-gradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="#10b981" stop-opacity="0.25" />
						<stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
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
					<path d={wpmAreaPath} fill="url(#perf-wpm-gradient)" />
				{/if}

				<!-- Accuracy Line -->
				{#if accPath}
					<path
						data-testid="accuracy-line"
						d={accPath}
						fill="none"
						stroke="#38bdf8"
						stroke-width="2"
						stroke-linejoin="round"
						stroke-linecap="round"
						opacity="0.8"
					/>
				{/if}

				<!-- Speed (WPM) Line -->
				{#if wpmPath}
					<path
						data-testid="wpm-line"
						d={wpmPath}
						fill="none"
						stroke="#10b981"
						stroke-width="2.5"
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

				<!-- Accuracy Points -->
				{#each accPoints as pt, i}
					<circle
						cx={pt.x}
						cy={pt.y}
						r={hoveredIndex === i ? 4 : 2.5}
						fill="#38bdf8"
						class="transition-all duration-150"
					/>
				{/each}

				<!-- WPM Points -->
				{#each wpmPoints as pt, i}
					<circle
						cx={pt.x}
						cy={pt.y}
						r={hoveredIndex === i ? 5 : 3}
						fill="#10b981"
						class="transition-all duration-150"
					/>
				{/each}

				<!-- X-axis Labels (Run index or date) -->
				{#each sortedRuns as run, i}
					{@const showLabel =
						sortedRuns.length <= 8 ||
						i === 0 ||
						i === sortedRuns.length - 1 ||
						(sortedRuns.length <= 20 && i % 3 === 0) ||
						(sortedRuns.length > 20 && i % 5 === 0)}
					{#if showLabel}
						<text
							x={getX(i)}
							y={height - 10}
							text-anchor="middle"
							class="fill-muted-foreground font-mono text-[10px]"
						>
							{formatShortDate(run.createdAt) || `#${i + 1}`}
						</text>
					{/if}
				{/each}

				<!-- Transparent Hover Slices -->
				{#each sortedRuns as run, i}
					{@const bounds = getSliceBounds(i, sortedRuns.length)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<rect
						data-testid="hover-trigger"
						x={bounds.x}
						y={padding.top}
						width={bounds.width}
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
