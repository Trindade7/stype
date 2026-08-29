<script lang="ts">
	import { onMount } from 'svelte';
	import { ModeWatcher, setMode } from 'mode-watcher';
	import { localStore } from '$lib/localStore';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { 
		KeyboardIcon, 
		UserCircleIcon, 
		LogOutIcon, 
		Sun03Icon, 
		Moon02Icon, 
		MonitorIcon,
		Book01Icon,
		Settings02Icon,
		Time02Icon,
		Chart01Icon,
		ShieldUserIcon
	} from '@hugeicons/core-free-icons';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { buttonVariants } from '$lib/components/ui/button';

	let { data, children } = $props();

	async function handleThemeChange(newTheme: 'light' | 'dark' | 'system') {
		setMode(newTheme);
		if (data.user) {
			try {
				await fetch('/api/settings', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ theme: newTheme })
				});
			} catch (err) {
				console.error('Failed to persist theme setting', err);
			}
		}
	}

	onMount(async () => {
		if (data.settings?.theme) {
			setMode(data.settings.theme);
		} else if (!data.user) {
			const guestSettings = await localStore.getSettings();
			if (guestSettings?.theme) {
				setMode(guestSettings.theme);
			}
		}
	});
</script>

<svelte:head>
	<title>Stype</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher defaultMode={data.settings?.theme ?? 'system'} />

{#if data.user && data.user.emailConfirmed}
	<div class="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
		<header class="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div class="mx-auto flex max-w-5xl items-center justify-between sm:justify-start px-6 py-4">
				<div class="flex sm:w-1/3 items-center gap-3">
					<a href="/app" class="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary transition-colors hover:bg-secondary/80">
						<HugeiconsIcon icon={KeyboardIcon} size={20} />
					</a>
					<a href="/app" class="text-xl font-bold tracking-tight text-foreground hover:text-foreground/80 transition-colors">stype</a>
				</div>

				<div class="hidden sm:flex sm:w-1/3 items-center justify-center gap-6">
					<a href="/app/history" class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
						History
					</a>
					<a href="/app/stats" class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
						Stats
					</a>
					<a href="/app/passages" class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
						Passages
					</a>
					<a href="/app/settings" class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
						Settings
					</a>
				</div>

				<div class="flex sm:w-1/3 items-center justify-end gap-2 sm:gap-4">
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

					<DropdownMenu.Root>
						<DropdownMenu.Trigger class={buttonVariants({ variant: 'outline' }) + " h-9 px-3 gap-2 max-w-[200px]"}>
							<HugeiconsIcon icon={UserCircleIcon} size={18} class="shrink-0" />
							<span class="hidden sm:inline-block text-sm font-medium truncate">{data.user.username}</span>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="w-48">
							<DropdownMenu.Item class="w-full cursor-pointer p-0 min-w-0">
								<a href="/app/user" class="w-full min-w-0 block px-2 py-1.5 truncate text-foreground hover:text-foreground">
									<span class="truncate block">Logged in as <span class="font-semibold">{data.user.username}</span></span>
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item class="w-full cursor-pointer p-0">
								<a href="/app/history" class="w-full flex items-center px-2 py-1.5">
									<HugeiconsIcon icon={Time02Icon} size={16} class="mr-2" />
									History
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Item class="w-full cursor-pointer p-0">
								<a href="/app/stats" class="w-full flex items-center px-2 py-1.5">
									<HugeiconsIcon icon={Chart01Icon} size={16} class="mr-2" />
									Stats
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Item class="w-full cursor-pointer p-0">
								<a href="/app/passages" class="w-full flex items-center px-2 py-1.5">
									<HugeiconsIcon icon={Book01Icon} size={16} class="mr-2" />
									Passages
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Item class="w-full cursor-pointer p-0">
								<a href="/app/settings" class="w-full flex items-center px-2 py-1.5">
									<HugeiconsIcon icon={Settings02Icon} size={16} class="mr-2" />
									Settings
								</a>
							</DropdownMenu.Item>
							{#if data.user.role === 'admin'}
								<DropdownMenu.Item class="w-full cursor-pointer p-0">
									<a href="/app/admin/users" class="w-full flex items-center px-2 py-1.5">
										<HugeiconsIcon icon={ShieldUserIcon} size={16} class="mr-2" />
										Administration
									</a>
								</DropdownMenu.Item>
							{/if}
							<DropdownMenu.Separator />
							<form method="POST" action="/app/logout">
								<DropdownMenu.Item class="text-destructive w-full cursor-pointer p-0">
									<button type="submit" class="w-full flex items-center px-2 py-1.5 text-left text-destructive">
										<HugeiconsIcon icon={LogOutIcon} size={16} class="mr-2" />
										Log out
									</button>
								</DropdownMenu.Item>
							</form>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</div>
		</header>
		<main class="flex-1 mt-[69px] flex flex-col min-h-0">
			{@render children()}
		</main>
	</div>
{:else}
	{@render children()}
{/if}


