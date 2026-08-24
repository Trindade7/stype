<script lang="ts">
	import type { ActionData } from './$types';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { KeyboardIcon, UserIcon, Key01Icon, Alert01Icon, LogInIcon } from '@hugeicons/core-free-icons';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Login - Stype</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950">
	<Card.Root class="w-full max-w-md border-zinc-800 bg-zinc-900/60 backdrop-blur">
		<Card.Header class="text-center pt-8 pb-0">
			<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400">
				<HugeiconsIcon icon={KeyboardIcon} size={28} />
			</div>
			<Card.Title class="mt-4 text-2xl font-bold tracking-tight text-zinc-100">stype</Card.Title>
			<Card.Description class="mt-1 text-sm text-zinc-400">Distraction-free typing speed test</Card.Description>
		</Card.Header>

		<Card.Content class="pt-8">
			{#if form?.message}
				<div class="mb-6 flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
					<HugeiconsIcon icon={Alert01Icon} size={20} color="currentColor" />
					<span>{form.message}</span>
				</div>
			{/if}

			<form method="POST" class="space-y-5">
				<div class="space-y-2">
					<Label for="username" class="text-xs font-semibold uppercase tracking-wider text-zinc-400">
						Username
					</Label>
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
							<HugeiconsIcon icon={UserIcon} size={18} />
						</div>
						<Input
							type="text"
							id="username"
							name="username"
							value={form?.username ?? ''}
							required
							autocomplete="username"
							placeholder="admin"
							class="pl-10 border-zinc-800 bg-zinc-950/70 text-zinc-100 placeholder-zinc-600 focus-visible:ring-emerald-500"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="password" class="text-xs font-semibold uppercase tracking-wider text-zinc-400">
						Password
					</Label>
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
							<HugeiconsIcon icon={Key01Icon} size={18} />
						</div>
						<Input
							type="password"
							id="password"
							name="password"
							required
							autocomplete="current-password"
							placeholder="••••••••"
							class="pl-10 border-zinc-800 bg-zinc-950/70 text-zinc-100 placeholder-zinc-600 focus-visible:ring-emerald-500"
						/>
					</div>
				</div>

				<Button
					type="submit"
					class="w-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400 focus-visible:ring-emerald-500"
				>
					<HugeiconsIcon icon={LogInIcon} size={20} />
					<span class="ml-2">Log in</span>
				</Button>
			</form>
		</Card.Content>

		<Card.Footer class="pb-8">
			<div class="w-full rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-4 text-center text-xs text-zinc-500">
				Default seeded account: <code class="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">admin</code> / <code class="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">admin123</code>
			</div>
		</Card.Footer>
	</Card.Root>
</div>
