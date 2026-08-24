<script lang="ts">
	import type { PageData } from './$types';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { KeyboardIcon, UserCircleIcon, LogOutIcon } from '@hugeicons/core-free-icons';
	import { Button } from '$lib/components/ui/button';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Stype — Minimalist Typing Test</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
	<header class="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
		<div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
			<div class="flex items-center gap-3">
				<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
					<HugeiconsIcon icon={KeyboardIcon} size={20} />
				</div>
				<span class="text-xl font-bold tracking-tight text-foreground">stype</span>
			</div>

			<div class="flex items-center gap-4">
				{#if data.user}
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<HugeiconsIcon icon={UserCircleIcon} size={18} />
						<span class="text-foreground">{data.user.username}</span>
					</div>
					<form method="POST" action="?/logout">
						<Button
							type="submit"
							variant="outline"
							size="sm"
							class="h-8 gap-1.5 px-3 text-xs"
							title="Log out"
						>
							<HugeiconsIcon icon={LogOutIcon} size={14} />
							<span>Log out</span>
						</Button>
					</form>
				{/if}
			</div>
		</div>
	</header>

	<main class="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-12">
		<div class="w-full max-w-2xl text-center space-y-4">
			<div class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
				<span class="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
				<span>Session active & authenticated</span>
			</div>
			<h2 class="text-3xl font-bold tracking-tight text-foreground">Ready to type</h2>
			<p class="text-sm text-muted-foreground">
				Welcome back, <span class="font-semibold text-foreground">{data.user?.username}</span>. Typing engine and passage selection are ready to connect.
			</p>
		</div>
	</main>
</div>
