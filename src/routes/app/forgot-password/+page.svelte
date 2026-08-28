<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		KeyboardIcon,
		UserIcon,
		Mail01Icon,
		Alert01Icon,
		CheckmarkCircle02Icon,
		ArrowLeft01Icon
	} from '@hugeicons/core-free-icons';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';

	let { form }: { form: ActionData } = $props();

	let identifier = $state('');
	let isSubmitting = $state(false);

	$effect.pre(() => {
		if (form?.identifier !== undefined) {
			identifier = form.identifier;
		}
	});

	function handleSubmit() {
		isSubmitting = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			try {
				await update();
			} finally {
				isSubmitting = false;
			}
		};
	}
</script>

<svelte:head>
	<title>Forgot Password - Stype</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground selection:bg-primary selection:text-primary-foreground">
	<Card.Root class="w-full max-w-md bg-card/60 backdrop-blur">
		<Card.Header class="text-center pt-8 pb-0">
			<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-primary">
				<HugeiconsIcon icon={KeyboardIcon} size={28} />
			</div>
			<Card.Title class="mt-4 text-2xl font-bold tracking-tight">stype</Card.Title>
			<Card.Description class="mt-1 text-sm text-muted-foreground">Recover your typist account</Card.Description>
		</Card.Header>

		<Card.Content class="pt-8">
			{#if form?.success}
				<div class="mb-6 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-foreground">
					<div class="flex items-start gap-2.5">
						<HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} class="text-success shrink-0 mt-0.5" />
						<div>
							<p class="font-medium text-foreground">Request received</p>
							<p class="mt-1 text-xs text-muted-foreground leading-relaxed">{form.message}</p>
						</div>
					</div>
				</div>
			{:else if form?.message}
				<div class="mb-6 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					<HugeiconsIcon icon={Alert01Icon} size={20} color="currentColor" />
					<span>{form.message}</span>
				</div>
			{/if}

			<form method="POST" class="space-y-4" use:enhance={handleSubmit}>
				<div class="space-y-2">
					<Label for="identifier" class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Username or Email
					</Label>
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
							<HugeiconsIcon icon={UserIcon} size={18} />
						</div>
						<Input
							type="text"
							id="identifier"
							name="identifier"
							bind:value={identifier}
							required
							autocomplete="username"
							placeholder="Username or email"
							class="h-10 pl-10"
						/>
					</div>
					<p class="text-xs text-muted-foreground">
						Enter the username or email address associated with your account.
					</p>
				</div>

				<Button
					type="submit"
					class="h-10 w-full"
					disabled={isSubmitting}
				>
					<HugeiconsIcon icon={Mail01Icon} size={20} />
					<span class="ml-2">{isSubmitting ? 'Sending...' : 'Send reset link'}</span>
				</Button>
			</form>

			<div class="mt-6 text-center text-sm text-muted-foreground">
				Remember your password?{' '}
				<a href="/app/login" class="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
					<HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
					<span>Back to login</span>
				</a>
			</div>
		</Card.Content>
	</Card.Root>
</div>
