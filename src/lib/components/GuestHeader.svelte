<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { KeyboardIcon, LogInIcon } from '@hugeicons/core-free-icons';
	import { buttonVariants } from '$lib/components/ui/button';
</script>

<header class="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="mx-auto flex max-w-5xl items-center justify-between sm:justify-start px-6 py-4">
		<div class="flex sm:w-1/3 items-center gap-3">
			<a href="/" class="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary transition-colors hover:bg-secondary/80">
				<HugeiconsIcon icon={KeyboardIcon} size={20} />
			</a>
			<a href="/" class="text-xl font-bold tracking-tight text-foreground hover:text-foreground/80 transition-colors">stype</a>
		</div>

		<div class="hidden sm:flex sm:w-1/3 items-center justify-center gap-6">
			<a href="/history" class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
				History
			</a>
			<a href="/settings" class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
				Settings
			</a>
		</div>

		<div class="flex sm:w-1/3 items-center justify-end gap-2 sm:gap-4">
			<a href="/app/login" class={buttonVariants({ variant: 'outline', size: 'sm' }) + " gap-2"}>
				<HugeiconsIcon icon={LogInIcon} size={16} />
				<span>Log in</span>
			</a>
		</div>
	</div>
</header>
