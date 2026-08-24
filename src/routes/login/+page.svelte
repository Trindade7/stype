<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Login - Stype</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950">
	<div class="w-full max-w-md space-y-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 backdrop-blur">
		<div class="text-center">
			<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400">
				<i class="bi bi-keyboard text-3xl"></i>
			</div>
			<h1 class="mt-4 text-2xl font-bold tracking-tight text-zinc-100">stype</h1>
			<p class="mt-1 text-sm text-zinc-400">Distraction-free typing speed test</p>
		</div>

		{#if form?.message}
			<div class="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
				<i class="bi bi-exclamation-triangle-fill text-red-400"></i>
				<span>{form.message}</span>
			</div>
		{/if}

		<form method="POST" class="space-y-5">
			<div>
				<label for="username" class="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
					Username
				</label>
				<div class="relative mt-2">
					<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
						<i class="bi bi-person"></i>
					</div>
					<input
						type="text"
						id="username"
						name="username"
						value={form?.username ?? ''}
						required
						autocomplete="username"
						placeholder="admin"
						class="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
					/>
				</div>
			</div>

			<div>
				<label for="password" class="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
					Password
				</label>
				<div class="relative mt-2">
					<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
						<i class="bi bi-key"></i>
					</div>
					<input
						type="password"
						id="password"
						name="password"
						required
						autocomplete="current-password"
						placeholder="••••••••"
						class="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
					/>
				</div>
			</div>

			<button
				type="submit"
				class="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
			>
				<i class="bi bi-box-arrow-in-right"></i>
				<span>Log in</span>
			</button>
		</form>

		<div class="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-4 text-center text-xs text-zinc-500">
			Default seeded account: <code class="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">admin</code> / <code class="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">admin123</code>
		</div>
	</div>
</div>
