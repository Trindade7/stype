<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Stype — Minimalist Typing Test</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950">
	<header class="border-b border-zinc-800 bg-zinc-900/40 backdrop-blur">
		<div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
			<div class="flex items-center gap-3">
				<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-emerald-400">
					<i class="bi bi-keyboard text-lg"></i>
				</div>
				<span class="text-xl font-bold tracking-tight text-zinc-100">stype</span>
			</div>

			<div class="flex items-center gap-4">
				{#if data.user}
					<div class="flex items-center gap-2 text-sm text-zinc-400">
						<i class="bi bi-person-circle text-zinc-500"></i>
						<span class="text-zinc-200">{data.user.username}</span>
					</div>
					<form method="POST" action="?/logout">
						<button
							type="submit"
							class="flex items-center gap-1.5 rounded-md border border-zinc-750 bg-zinc-850 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
							title="Log out"
						>
							<i class="bi bi-box-arrow-right"></i>
							<span>Log out</span>
						</button>
					</form>
				{/if}
			</div>
		</div>
	</header>

	<main class="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-12">
		<div class="w-full max-w-2xl text-center space-y-4">
			<div class="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
				<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
				<span>Session active & authenticated</span>
			</div>
			<h2 class="text-3xl font-bold tracking-tight text-zinc-100">Ready to type</h2>
			<p class="text-zinc-400 text-sm">
				Welcome back, <span class="text-zinc-200 font-semibold">{data.user?.username}</span>. Typing engine and passage selection are ready to connect.
			</p>
		</div>
	</main>
</div>
