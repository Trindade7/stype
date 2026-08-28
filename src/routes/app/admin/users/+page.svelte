<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ShieldUserIcon } from '@hugeicons/core-free-icons';

	let { data } = $props();
</script>

<svelte:head>
	<title>Administration — Stype</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-6 py-8 w-full">
	<div class="mb-8">
		<div class="flex items-center gap-2">
			<HugeiconsIcon icon={ShieldUserIcon} size={28} class="text-primary" />
			<h1 class="text-3xl font-bold tracking-tight">Administration</h1>
		</div>
		<p class="text-muted-foreground mt-1">Manage users, account credentials, and system roles.</p>
	</div>
</div>
