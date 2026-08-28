<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		KeyboardIcon,
		Mail01Icon,
		Alert01Icon,
		CheckmarkCircle02Icon,
		LogOutIcon
	} from '@hugeicons/core-free-icons';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isResending = $state(false);

	function handleResend() {
		isResending = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			try {
				await update();
			} finally {
				isResending = false;
			}
		};
	}
</script>

<svelte:head>
	<title>Verify your email - Stype</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground selection:bg-primary selection:text-primary-foreground">
	<Card.Root class="w-full max-w-md bg-card/60 backdrop-blur">
		<Card.Header class="text-center pt-8 pb-0">
			<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-primary">
				<HugeiconsIcon icon={KeyboardIcon} size={28} />
			</div>
			<Card.Title class="mt-4 text-2xl font-bold tracking-tight">stype</Card.Title>
			<Card.Description class="mt-1 text-sm text-muted-foreground">Verify your email</Card.Description>
		</Card.Header>

		<Card.Content class="pt-6 space-y-6">
			{#if form?.success}
				<div class="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-foreground">
					<div class="flex items-start gap-2.5">
						<HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} class="text-success shrink-0 mt-0.5" />
						<div>
							<p class="font-medium text-foreground">Email sent</p>
							<p class="mt-1 text-xs text-muted-foreground leading-relaxed">{form.message}</p>
						</div>
					</div>
				</div>
			{:else if form?.message}
				<div class="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					<HugeiconsIcon icon={Alert01Icon} size={20} color="currentColor" />
					<span>{form.message}</span>
				</div>
			{/if}

			<div class="rounded-lg border border-border bg-secondary/30 p-4 text-sm space-y-2">
				<div class="flex items-center gap-2 text-foreground font-medium">
					<HugeiconsIcon icon={Mail01Icon} size={18} class="text-muted-foreground shrink-0" />
					<span>Check your inbox</span>
				</div>
				<p class="text-xs text-muted-foreground leading-relaxed">
					We sent a verification link to <strong class="text-foreground font-semibold break-all">{data.email}</strong>. Open the link to activate your account and start typing.
				</p>
				<p class="text-xs text-muted-foreground">
					The verification link is valid for 1 hour.
				</p>
			</div>

			<div class="space-y-3">
				<form method="POST" action="?/resend" use:enhance={handleResend}>
					<Button
						type="submit"
						class="w-full h-10"
						disabled={isResending}
					>
						{#if isResending}
							<span>Sending...</span>
						{:else}
							<HugeiconsIcon icon={Mail01Icon} size={18} />
							<span class="ml-2">Resend confirmation email</span>
						{/if}
					</Button>
				</form>

				<form method="POST" action="?/logout">
					<Button
						type="submit"
						variant="outline"
						class="w-full h-10 text-muted-foreground hover:text-foreground"
					>
						<HugeiconsIcon icon={LogOutIcon} size={18} />
						<span class="ml-2">Log out</span>
					</Button>
				</form>
			</div>
		</Card.Content>
	</Card.Root>
</div>
