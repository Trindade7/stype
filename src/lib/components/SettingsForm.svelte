<script lang="ts">
	import { enhance } from '$app/forms';
	import { setMode } from 'mode-watcher';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';

	export interface SettingsValues {
		mode: 'passage' | 'timed';
		duration: number;
		passageLength: 'all' | 'short' | 'medium' | 'long';
		zenMode: boolean;
		theme: 'system' | 'dark' | 'light';
	}

	export interface SettingsFormProps {
		settings?: Partial<SettingsValues>;
		action?: string;
		form?: { success?: boolean; error?: string } | null;
		onSave?: (values: SettingsValues) => Promise<{ success?: boolean; error?: string } | void> | { success?: boolean; error?: string } | void;
	}

	let {
		settings = {
			mode: 'passage',
			duration: 30,
			passageLength: 'all',
			zenMode: false,
			theme: 'system'
		},
		action = '?/save',
		form = null,
		onSave
	}: SettingsFormProps = $props();

	let mode = $state<'passage' | 'timed'>('passage');
	let duration = $state<string>('30');
	let passageLength = $state<'all' | 'short' | 'medium' | 'long'>('all');
	let zenMode = $state<boolean>(false);
	let theme = $state<'system' | 'dark' | 'light'>('system');

	let localSuccess = $state(false);
	let localError = $state<string | null>(null);
	let isSaving = $state(false);

	const durationLabels: Record<string, string> = {
		'15': '15 seconds',
		'30': '30 seconds',
		'60': '60 seconds'
	};

	const passageLengthLabels: Record<string, string> = {
		all: 'All Lengths',
		short: 'Short (< 50 words)',
		medium: 'Medium (50–100 words)',
		long: 'Long (> 100 words)'
	};

	const themeLabels: Record<string, string> = {
		system: 'System Default',
		dark: 'Dark',
		light: 'Light'
	};

	$effect.pre(() => {
		if (settings) {
			mode = settings.mode ?? 'passage';
			duration = String(settings.duration ?? 30);
			passageLength = settings.passageLength ?? 'all';
			zenMode = settings.zenMode ?? false;
			theme = settings.theme ?? 'system';
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		if (onSave) {
			e.preventDefault();
			isSaving = true;
			localSuccess = false;
			localError = null;
			try {
				setMode(theme);
				const result = await onSave({
					mode,
					duration: Number(duration),
					passageLength,
					zenMode,
					theme
				});
				if (result && typeof result === 'object') {
					if (result.success) {
						localSuccess = true;
						localError = null;
					} else if (result.error) {
						localError = result.error;
						localSuccess = false;
					}
				} else {
					localSuccess = true;
					localError = null;
				}
			} catch (err: any) {
				localError = err?.message ?? 'Failed to save settings';
				localSuccess = false;
			} finally {
				isSaving = false;
			}
		}
	}
</script>

<div>
	{#if form?.success || localSuccess}
		<div class="mb-6 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm font-medium text-emerald-500 animate-in fade-in">
			<HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
			<span>Settings saved successfully.</span>
		</div>
	{/if}

	{#if form?.error || localError}
		<div class="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in">
			{form?.error ?? localError}
		</div>
	{/if}

	{#snippet formContent()}
		<!-- Test Mode Settings -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Test Mode</Card.Title>
				<Card.Description>Choose your default test mode when starting a practice session.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<RadioGroup.Root bind:value={mode} name="mode" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Label
						for="mode-passage"
						class="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 {mode === 'passage' ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}"
					>
						<RadioGroup.Item value="passage" id="mode-passage" class="mt-1" />
						<div>
							<span class="font-medium text-foreground block">Passage Mode</span>
							<span class="text-xs text-muted-foreground">Type the entire passage from start to finish with an upward timer.</span>
						</div>
					</Label>

					<Label
						for="mode-timed"
						class="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 {mode === 'timed' ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}"
					>
						<RadioGroup.Item value="timed" id="mode-timed" class="mt-1" />
						<div>
							<span class="font-medium text-foreground block">Timed Mode</span>
							<span class="text-xs text-muted-foreground">Type against a countdown timer with fixed sprint durations.</span>
						</div>
					</Label>
				</RadioGroup.Root>

				{#if mode === 'timed'}
					<div class="grid gap-2 pt-2 animate-in fade-in">
						<Label id="duration-label" for="duration">Default Duration</Label>
						<Select.Root type="single" name="duration" bind:value={duration}>
							<Select.Trigger id="duration" class="w-full" aria-labelledby="duration-label">
								{durationLabels[duration] || 'Select duration'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="15" label="15 seconds">15 seconds</Select.Item>
								<Select.Item value="30" label="30 seconds">30 seconds</Select.Item>
								<Select.Item value="60" label="60 seconds">60 seconds</Select.Item>
							</Select.Content>
						</Select.Root>
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
					<Label id="passageLength-label" for="passageLength">Preferred Passage Length</Label>
					<Select.Root type="single" name="passageLength" bind:value={passageLength}>
						<Select.Trigger id="passageLength" class="w-full" aria-labelledby="passageLength-label">
							{passageLengthLabels[passageLength] || 'Select passage length'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all" label="All Lengths">All Lengths</Select.Item>
							<Select.Item value="short" label="Short (< 50 words)">Short (&lt; 50 words)</Select.Item>
							<Select.Item value="medium" label="Medium (50–100 words)">Medium (50–100 words)</Select.Item>
							<Select.Item value="long" label="Long (> 100 words)">Long (&gt; 100 words)</Select.Item>
						</Select.Content>
					</Select.Root>
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
					<Label id="theme-label" for="theme">Visual Theme</Label>
					<Select.Root type="single" name="theme" bind:value={theme}>
						<Select.Trigger id="theme" class="w-full" aria-labelledby="theme-label">
							{themeLabels[theme] || 'Select theme'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="system" label="System Default">System Default</Select.Item>
							<Select.Item value="dark" label="Dark">Dark</Select.Item>
							<Select.Item value="light" label="Light">Light</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
					<div class="grid gap-0.5">
						<Label for="zenMode" class="font-medium cursor-pointer">Zen Mode</Label>
						<p class="text-xs text-muted-foreground">
							Hide live HUD metrics (WPM, accuracy, timer) while typing. Metrics are revealed once the test run completes.
						</p>
					</div>
					<Switch id="zenMode" name="zenMode" bind:checked={zenMode} />
				</div>
			</Card.Content>
		</Card.Root>

		<div class="flex justify-end">
			<Button type="submit" size="lg" disabled={isSaving}>Save Settings</Button>
		</div>
	{/snippet}

	{#if onSave}
		<form onsubmit={handleSubmit} class="space-y-6">
			{@render formContent()}
		</form>
	{:else}
		<form
			method="POST"
			action={action}
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
			{@render formContent()}
		</form>
	{/if}
</div>
