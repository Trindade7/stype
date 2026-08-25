<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import SettingsForm from '$lib/components/SettingsForm.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Settings02Icon } from '@hugeicons/core-free-icons';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Settings — Stype</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-6 py-8">
	<div class="mb-8">
		<div class="flex items-center gap-2">
			<HugeiconsIcon icon={Settings02Icon} size={28} class="text-primary" />
			<h1 class="text-3xl font-bold tracking-tight">Settings</h1>
		</div>
		<p class="text-muted-foreground mt-1">Configure your default typing test environment and preferences.</p>
	</div>

	<SettingsForm settings={data.settings} {form} action="?/save" />
</div>
