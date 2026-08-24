<script lang="ts">
	import { enhance } from '$app/forms';
	import { setMode } from 'mode-watcher';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Settings02Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';

	let { data, form } = $props();

	let mode = $state<'passage' | 'timed'>('passage');
	let duration = $state(30);
	let passageLength = $state<'all' | 'short' | 'medium' | 'long'>('all');
	let zenMode = $state(false);
	let theme = $state<'system' | 'dark' | 'light'>('system');

	$effect(() => {
		mode = data.settings.mode;
		duration = data.settings.duration;
		passageLength = data.settings.passageLength;
		zenMode = data.settings.zenMode;
		theme = data.settings.theme;
	});

	const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
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

	{#if form?.success}
		<div class="mb-6 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm font-medium text-emerald-500 animate-in fade-in">
			<HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
			<span>Settings saved successfully.</span>
		</div>
	{/if}

	{#if form?.error}
		<div class="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in">
			{form.error}
		</div>
	{/if}

	<form 
		method="POST" 
		action="?/save" 
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') {
					setMode(theme);
				}
				await update();
			};
		}}
		class="space-y-6"
	>
		<!-- Test Mode Settings -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Test Mode</Card.Title>
				<Card.Description>Choose your default test mode when starting a practice session.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<label class="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 {mode === 'passage' ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}">
						<input 
							type="radio" 
							name="mode" 
							value="passage" 
							checked={mode === 'passage'} 
							onchange={() => mode = 'passage'}
							class="mt-1"
						/>
						<div>
							<span class="font-medium text-foreground block">Passage Mode</span>
							<span class="text-xs text-muted-foreground">Type the entire passage from start to finish with an upward timer.</span>
						</div>
					</label>

					<label class="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 {mode === 'timed' ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}">
						<input 
							type="radio" 
							name="mode" 
							value="timed" 
							checked={mode === 'timed'} 
							onchange={() => mode = 'timed'}
							class="mt-1"
						/>
						<div>
							<span class="font-medium text-foreground block">Timed Mode</span>
							<span class="text-xs text-muted-foreground">Type against a countdown timer with fixed sprint durations.</span>
						</div>
					</label>
				</div>

				{#if mode === 'timed'}
					<div class="grid gap-2 pt-2 animate-in fade-in">
						<Label for="duration">Default Duration</Label>
						<select id="duration" name="duration" bind:value={duration} class={selectClass}>
							<option value={15}>15 seconds</option>
							<option value={30}>30 seconds</option>
							<option value={60}>60 seconds</option>
						</select>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Passage Selection Settings -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Passage Length</Card.Title>
				<Card.Description>Filter passages randomly presented during test runs by length.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid gap-2">
					<Label for="passageLength">Preferred Passage Length</Label>
					<select id="passageLength" name="passageLength" bind:value={passageLength} class={selectClass}>
						<option value="all">All Lengths</option>
						<option value="short">Short (&lt; 50 words)</option>
						<option value="medium">Medium (50–100 words)</option>
						<option value="long">Long (&gt; 100 words)</option>
					</select>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Visual & Focus Settings -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Display & Focus</Card.Title>
				<Card.Description>Customize the visual theme and distraction-free features.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="grid gap-2">
					<Label for="theme">Visual Theme</Label>
					<select id="theme" name="theme" bind:value={theme} class={selectClass}>
						<option value="system">System Default</option>
						<option value="dark">Dark</option>
						<option value="light">Light</option>
					</select>
				</div>

				<div class="flex items-start gap-3 rounded-lg border border-border p-4">
					<input 
						type="checkbox" 
						id="zenMode" 
						name="zenMode" 
						bind:checked={zenMode}
						class="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
					/>
					<div class="grid gap-0.5">
						<Label for="zenMode" class="font-medium cursor-pointer">Zen Mode</Label>
						<p class="text-xs text-muted-foreground">
							Hide live HUD metrics (WPM, accuracy, timer) while typing. Metrics are revealed once the test run completes.
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<div class="flex justify-end">
			<Button type="submit" size="lg">Save Settings</Button>
		</div>
	</form>
</div>
