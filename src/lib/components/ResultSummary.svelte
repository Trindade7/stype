<script lang="ts">
  import { onMount } from "svelte";
  import type { TimelineSnapshot } from "$lib/server/db/schema";
  import TimelineChart from "./TimelineChart.svelte";

  let {
    wpm = 0,
    accuracy = 100,
    timeElapsed = 0,
    timelineSnapshots = [],
    isSaving = false,
    nextPassageButtonText = "Next Passage (Tab)",
    retryButtonText = "Retry (Space)",
    restartButtonText,
    onNextPassage,
    onRetry,
    onRestart,
  }: {
    wpm?: number;
    accuracy?: number;
    timeElapsed?: number;
    timelineSnapshots?: TimelineSnapshot[];
    isSaving?: boolean;
    nextPassageButtonText?: string;
    retryButtonText?: string;
    restartButtonText?: string;
    onNextPassage?: () => void;
    onRetry?: () => void;
    onRestart?: () => void;
  } = $props();

  function handleNext() {
    if (onNextPassage) {
      onNextPassage();
    } else if (onRestart) {
      onRestart();
    }
  }

  function handleRetry() {
    if (onRetry) {
      onRetry();
    } else if (onRestart) {
      onRestart();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      handleRetry();
    } else if (e.key === "Tab") {
      e.preventDefault();
      handleNext();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

<div
  class="flex flex-col items-center justify-center py-2 space-y-6 sm:space-y-8 animate-in fade-in duration-500"
>
  <div class="flex items-center gap-3 text-emerald-400">
    <i class="bi bi-check-circle-fill text-3xl"></i>
    <h3 class="text-3xl font-bold text-center text-zinc-100">
      Passage Complete
    </h3>
  </div>

  {#if isSaving}
    <div class="text-zinc-400 animate-pulse">Saving results...</div>
  {:else}
    <div class="grid grid-cols-3 gap-3 sm:gap-6 md:gap-8 w-full max-w-lg">
      <div
        class="flex flex-col items-center p-2.5 sm:p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
      >
        <span class="uppercase text-xs font-semibold text-zinc-500 mb-1"
          >Speed</span
        >
        <span
          class="text-2xl sm:text-4xl font-bold text-emerald-400 whitespace-nowrap"
          >{wpm}
          <span class="text-sm sm:text-lg text-emerald-500/50">WPM</span></span
        >
      </div>
      <div
        class="flex flex-col items-center p-2.5 sm:p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
      >
        <span class="uppercase text-xs font-semibold text-zinc-500 mb-1"
          >Accuracy</span
        >
        <span
          class="text-2xl sm:text-4xl font-bold text-zinc-100 whitespace-nowrap"
          >{accuracy}<span class="text-sm sm:text-lg text-zinc-500">%</span
          ></span
        >
      </div>
      <div
        class="flex flex-col items-center p-2.5 sm:p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
      >
        <span class="uppercase text-xs font-semibold text-zinc-500 mb-1"
          >Time</span
        >
        <span
          class="text-2xl sm:text-4xl font-bold text-zinc-100 whitespace-nowrap"
          >{timeElapsed}<span class="text-sm sm:text-lg text-zinc-500">s</span
          ></span
        >
      </div>
    </div>

    {#if timelineSnapshots && timelineSnapshots.length > 0}
      <div class="w-full max-w-2xl">
        <TimelineChart snapshots={timelineSnapshots} />
      </div>
    {/if}
  {/if}

  {#if onNextPassage || onRetry || onRestart}
    <div class="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
      {#if onNextPassage || onRestart}
        <button
          onclick={handleNext}
          class="flex items-center gap-2 rounded-lg bg-zinc-100 px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          <i class="bi bi-skip-forward-fill"></i>
          {restartButtonText ?? nextPassageButtonText}
        </button>
      {/if}
      {#if onRetry}
        <button
          onclick={handleRetry}
          class="flex items-center gap-2 rounded-lg border border-zinc-700 bg-transparent px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          <i class="bi bi-arrow-counterclockwise"></i>
          {retryButtonText}
        </button>
      {/if}
    </div>
  {/if}
</div>
