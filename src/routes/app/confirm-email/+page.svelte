<script lang="ts">
	import type { PageData } from './$types';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		KeyboardIcon,
		Alert01Icon,
		Mail01Icon,
		ArrowLeft01Icon
	} from '@hugeicons/core-free-icons';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Confirm email - Stype</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground selection:bg-primary selection:text-primary-foreground">
	<Card.Root class="w-full max-w-md bg-card/60 backdrop-blur">
		<Card.Header class="text-center pt-8 pb-0">
			<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-primary">
				<HugeiconsIcon icon={KeyboardIcon} size={28} />
			</div>
			<Card.Title class="mt-4 text-2xl font-bold tracking-tight">stype</Card.Title>
			<Card.Description class="mt-1 text-sm text-muted-foreground">Confirmation failed</Card.Description>
		</Card.Header>

		<Card.Content class="pt-6 space-y-6">
			<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
				<div class="flex items-start gap-3">
					<HugeiconsIcon icon={Alert01Icon} size={20} class="shrink-0 mt-0.5" />
					<div>
						<p class="font-medium">Invalid or Expired Link</p>
						<p class="mt-1 text-xs text-muted-foreground leading-relaxed">
							{data.error ?? 'This email confirmation link is invalid or has expired. Please request a new confirmation email.'}
						</p>
					</div>
				</div>
			</div>

			<div class="space-y-3">
				<Button
					href="/app/verify-email"
					class="w-full h-10"
				>
					<HugeiconsIcon icon={Mail01Icon} size={18} />
					<span class="ml-2">Request a new confirmation email</span>
				</Button>

				<Button
					href="/app/login"
					variant="outline"
					class="w-full h-10 text-muted-foreground hover:text-foreground"
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
					<span class="ml-2">Back to sign in</span>
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
