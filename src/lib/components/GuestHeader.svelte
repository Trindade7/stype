<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		KeyboardIcon,
		LogInIcon,
		Menu01Icon,
		Sun03Icon,
		Moon02Icon,
		MonitorIcon,
		Time02Icon,
		Chart01Icon,
		Book01Icon,
		Settings02Icon,
		CloudIcon,
		UserCircleIcon
	} from '@hugeicons/core-free-icons';
	import { buttonVariants } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { setMode } from 'mode-watcher';
	import { localStore } from '$lib/localStore';
	import { viewportLayout } from '$lib/viewport';
	import { syncController } from '$lib/sync';
	import AccountLinkingDialog from '$lib/components/AccountLinkingDialog.svelte';

	let isCompact = $derived($viewportLayout.isCompact);
	let isMobileMenuOpen = $state(false);
	let isAccountDialogOpen = $state(false);

	const syncState = $derived($syncController);
	const isLinked = $derived(!!syncState.account);

	async function handleThemeChange(newTheme: 'light' | 'dark' | 'system') {
		setMode(newTheme);
		await localStore.saveSettings({ theme: newTheme });
		isMobileMenuOpen = false;
	}

	function closeMobileMenu() {
		isMobileMenuOpen = false;
	}
</script>

<header
	class="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200 {isCompact ? '-translate-y-full pointer-events-none opacity-0' : 'translate-y-0 opacity-100'}"
	data-collapsed={isCompact ? 'true' : 'false'}
>
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
			<a href="/stats" class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
				Stats
			</a>
			<a href="/passages" class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
				Passages
			</a>
			<a href="/settings" class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
				Settings
			</a>
		</div>

		<div class="flex sm:w-1/3 items-center justify-end gap-2 sm:gap-4">
			<!-- Desktop Theme Switcher -->
			<div class="hidden sm:flex">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger class={buttonVariants({ variant: 'ghost', size: 'icon' }) + " h-9 w-9 rounded-md"}>
						<div class="flex items-center justify-center dark:hidden">
							<HugeiconsIcon icon={Sun03Icon} size={18} />
						</div>
						<div class="hidden items-center justify-center dark:flex">
							<HugeiconsIcon icon={Moon02Icon} size={18} />
						</div>
						<span class="sr-only">Toggle theme</span>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Item onclick={() => handleThemeChange('light')}>
							<HugeiconsIcon icon={Sun03Icon} size={16} class="mr-2" />
							Light
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => handleThemeChange('dark')}>
							<HugeiconsIcon icon={Moon02Icon} size={16} class="mr-2" />
							Dark
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={() => handleThemeChange('system')}>
							<HugeiconsIcon icon={MonitorIcon} size={16} class="mr-2" />
							System
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>

			<!-- Desktop Link Account / Sync Button -->
			<div class="hidden sm:flex">
				<button
					type="button"
					class={buttonVariants({ variant: isLinked ? 'secondary' : 'outline', size: 'sm' }) + " gap-1.5"}
					onclick={() => (isAccountDialogOpen = true)}
					aria-label={isLinked ? 'Sync account' : 'Link server account'}
				>
					<HugeiconsIcon icon={CloudIcon} size={16} />
					<span>{isLinked ? 'Sync' : 'Link Account'}</span>
				</button>
			</div>

			<!-- Desktop Log in Button / User Info -->
			<div class="hidden sm:flex">
				{#if isLinked && syncState.account}
					<button
						type="button"
						class={buttonVariants({ variant: 'ghost', size: 'sm' }) + " gap-1.5 font-medium max-w-[150px] truncate"}
						onclick={() => (isAccountDialogOpen = true)}
						aria-label="Account details"
					>
						<HugeiconsIcon icon={UserCircleIcon} size={16} class="shrink-0" />
						<span class="truncate">{syncState.account.user.username}</span>
					</button>
				{:else}
					<a href="/app/login" class={buttonVariants({ variant: 'outline', size: 'sm' }) + " gap-2"}>
						<HugeiconsIcon icon={LogInIcon} size={16} />
						<span>Log in</span>
					</a>
				{/if}
			</div>

			<!-- Mobile Navigation Menu Dropdown -->
			<div class="sm:hidden">
				<DropdownMenu.Root bind:open={isMobileMenuOpen}>
					<DropdownMenu.Trigger
						class={buttonVariants({ variant: 'outline', size: 'icon' }) + " h-9 w-9 sm:hidden"}
						aria-label="Toggle navigation menu"
					>
						<HugeiconsIcon icon={Menu01Icon} size={20} />
						<span class="sr-only">Toggle navigation menu</span>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-56">
						<DropdownMenu.Label>Navigation</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item class="w-full cursor-pointer p-0" onclick={closeMobileMenu}>
							<a href="/history" class="w-full flex items-center px-2 py-1.5">
								<HugeiconsIcon icon={Time02Icon} size={16} class="mr-2" />
								History
							</a>
						</DropdownMenu.Item>
						<DropdownMenu.Item class="w-full cursor-pointer p-0" onclick={closeMobileMenu}>
							<a href="/stats" class="w-full flex items-center px-2 py-1.5">
								<HugeiconsIcon icon={Chart01Icon} size={16} class="mr-2" />
								Stats
							</a>
						</DropdownMenu.Item>
						<DropdownMenu.Item class="w-full cursor-pointer p-0" onclick={closeMobileMenu}>
							<a href="/passages" class="w-full flex items-center px-2 py-1.5">
								<HugeiconsIcon icon={Book01Icon} size={16} class="mr-2" />
								Passages
							</a>
						</DropdownMenu.Item>
						<DropdownMenu.Item class="w-full cursor-pointer p-0" onclick={closeMobileMenu}>
							<a href="/settings" class="w-full flex items-center px-2 py-1.5">
								<HugeiconsIcon icon={Settings02Icon} size={16} class="mr-2" />
								Settings
							</a>
						</DropdownMenu.Item>

						<DropdownMenu.Separator />
						<DropdownMenu.Label>Theme</DropdownMenu.Label>
						<DropdownMenu.Item onclick={() => handleThemeChange('light')}>
							<HugeiconsIcon icon={Sun03Icon} size={16} class="mr-2" />
							Light
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => handleThemeChange('dark')}>
							<HugeiconsIcon icon={Moon02Icon} size={16} class="mr-2" />
							Dark
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => handleThemeChange('system')}>
							<HugeiconsIcon icon={MonitorIcon} size={16} class="mr-2" />
							System
						</DropdownMenu.Item>

						<DropdownMenu.Separator />
						<DropdownMenu.Item class="w-full cursor-pointer p-0" onclick={() => { closeMobileMenu(); isAccountDialogOpen = true; }}>
							<button type="button" class="w-full flex items-center px-2 py-1.5 font-medium text-left">
								<HugeiconsIcon icon={CloudIcon} size={16} class="mr-2" />
								{isLinked ? 'Sync Account' : 'Link Server Account'}
							</button>
						</DropdownMenu.Item>
						{#if isLinked && syncState.account}
							<DropdownMenu.Item class="w-full cursor-pointer p-0" onclick={() => { closeMobileMenu(); isAccountDialogOpen = true; }}>
								<button type="button" class="w-full flex items-center px-2 py-1.5 font-medium text-left">
									<HugeiconsIcon icon={UserCircleIcon} size={16} class="mr-2" />
									<span>{syncState.account.user.username}</span>
								</button>
							</DropdownMenu.Item>
						{:else}
							<DropdownMenu.Item class="w-full cursor-pointer p-0" onclick={closeMobileMenu}>
								<a href="/app/login" class="w-full flex items-center px-2 py-1.5 font-medium">
									<HugeiconsIcon icon={LogInIcon} size={16} class="mr-2" />
									Log in
								</a>
							</DropdownMenu.Item>
						{/if}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>
	</div>
</header>

<AccountLinkingDialog bind:open={isAccountDialogOpen} />
