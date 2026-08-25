<script lang="ts">
	import { onMount } from 'svelte';
	import GuestHeader from '$lib/components/GuestHeader.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Pagination from '$lib/components/ui/pagination';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { PlusIcon, Edit01Icon, Delete01Icon } from '@hugeicons/core-free-icons';
	import { getPassageLength } from '$lib/passage-utils';
	import { localStore, type GuestPassage } from '$lib/localStore';

	let passages = $state<GuestPassage[]>(localStore.getAllPassages());
	let isCreateOpen = $state(false);
	let editingId = $state<number | null>(null);
	let editText = $state('');
	let editSource = $state('');
	let newText = $state('');
	let newSource = $state('');
	let createError = $state<string | null>(null);
	let currentPage = $state(1);

	onMount(() => {
		passages = localStore.getAllPassages();
	});

	function refreshPassages() {
		passages = localStore.getAllPassages();
	}

	let paginatedPassages = $derived(passages.slice((currentPage - 1) * 10, currentPage * 10));

	$effect(() => {
		const totalPages = Math.max(1, Math.ceil(passages.length / 10));
		if (currentPage > totalPages) {
			currentPage = totalPages;
		}
	});

	const textareaClass = "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

	function displayPassageLength(text: string) {
		const len = getPassageLength(text);
		return len.charAt(0).toUpperCase() + len.slice(1);
	}

	function handleCreate(e: SubmitEvent) {
		e.preventDefault();
		if (!newText.trim()) {
			createError = 'Text is required';
			return;
		}
		localStore.saveCustomPassage({
			text: newText,
			source: newSource.trim() || undefined
		});
		newText = '';
		newSource = '';
		createError = null;
		isCreateOpen = false;
		refreshPassages();
	}

	function startEdit(passage: GuestPassage) {
		editingId = passage.id;
		editText = passage.text;
		editSource = passage.source ?? '';
	}

	function handleUpdate(e: SubmitEvent) {
		e.preventDefault();
		if (editingId === null || !editText.trim()) {
			return;
		}
		localStore.updateCustomPassage(editingId, {
			text: editText,
			source: editSource.trim() || undefined
		});
		editingId = null;
		refreshPassages();
	}

	function handleDelete(id: number) {
		localStore.deleteCustomPassage(id);
		refreshPassages();
	}
</script>

<svelte:head>
	<title>Passages — Stype</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
	<GuestHeader />

	<main class="mx-auto max-w-5xl px-6 py-8 flex-1 w-full mt-[69px]">
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Passages</h1>
				<p class="text-muted-foreground mt-1">Manage your custom typing practice passages.</p>
			</div>

			<Dialog.Root bind:open={isCreateOpen}>
				<Dialog.Trigger class={buttonVariants({ variant: 'default' })}>
					<HugeiconsIcon icon={PlusIcon} size={18} class="mr-2" />
					New Passage
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Create Custom Passage</Dialog.Title>
						<Dialog.Description>
							Add a new passage to practice typing.
						</Dialog.Description>
					</Dialog.Header>
					
					<form onsubmit={handleCreate}>
						<div class="grid gap-4 py-4">
							<div class="grid gap-2">
								<Label for="text">Text</Label>
								<textarea
									id="text"
									name="text"
									required
									bind:value={newText}
									class={textareaClass}
									placeholder="Type or paste passage text here..."
								></textarea>
							</div>
							<div class="grid gap-2">
								<Label for="source">Source (Optional)</Label>
								<Input
									id="source"
									name="source"
									bind:value={newSource}
									placeholder="e.g. 1984, George Orwell"
								/>
							</div>
						</div>
						<Dialog.Footer>
							<Button type="button" variant="outline" onclick={() => isCreateOpen = false}>Cancel</Button>
							<Button type="submit">Create Passage</Button>
						</Dialog.Footer>
					</form>
				</Dialog.Content>
			</Dialog.Root>
		</div>

		{#if createError}
			<div class="mb-6 rounded-md bg-destructive/15 p-4 text-sm text-destructive">
				{createError}
			</div>
		{/if}

		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each paginatedPassages as passage (passage.id)}
				<Card.Root>
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between gap-2">
							<div class="flex items-center gap-2">
								{#if !passage.isCustom}
									<Badge variant="secondary">Seeded</Badge>
								{:else}
									<Badge>Custom</Badge>
								{/if}
								<Badge variant="outline">{displayPassageLength(passage.text)}</Badge>
							</div>
							
							{#if passage.isCustom}
								<div class="flex items-center gap-1">
									<Dialog.Root open={editingId === passage.id} onOpenChange={(open) => { if (!open) editingId = null; else startEdit(passage); }}>
										<Dialog.Trigger aria-label="Edit passage" class={buttonVariants({ variant: 'ghost', size: 'icon' }) + " h-8 w-8"}>
											<HugeiconsIcon icon={Edit01Icon} size={16} />
										</Dialog.Trigger>
										<Dialog.Content>
											<Dialog.Header>
												<Dialog.Title>Edit Passage</Dialog.Title>
											</Dialog.Header>
											<form onsubmit={handleUpdate}>
												<div class="grid gap-4 py-4">
													<div class="grid gap-2">
														<Label for="edit-text">Text</Label>
														<textarea id="edit-text" name="text" required bind:value={editText} class={textareaClass}></textarea>
													</div>
													<div class="grid gap-2">
														<Label for="edit-source">Source</Label>
														<Input id="edit-source" name="source" bind:value={editSource} />
													</div>
												</div>
												<Dialog.Footer>
													<Button type="button" variant="outline" onclick={() => editingId = null}>Cancel</Button>
													<Button type="submit">Save Changes</Button>
												</Dialog.Footer>
											</form>
										</Dialog.Content>
									</Dialog.Root>

									<Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label="Delete passage"
										onclick={() => handleDelete(passage.id)}
										class="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
									>
										<HugeiconsIcon icon={Delete01Icon} size={16} />
									</Button>
								</div>
							{/if}
						</div>
						<Card.Title class="mt-4 line-clamp-1 text-base">
							{passage.source || 'Unknown Source'}
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<p class="line-clamp-4 text-sm text-muted-foreground">
							{passage.text}
						</p>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		{#if passages.length > 10}
			<div class="mt-6">
				<Pagination.Root count={passages.length} perPage={10} bind:page={currentPage}>
					{#snippet children({ pages, currentPage })}
						<Pagination.Content>
							<Pagination.Item>
								<Pagination.Previous />
							</Pagination.Item>
							{#each pages as page (page.key)}
								{#if page.type === "ellipsis"}
									<Pagination.Item>
										<Pagination.Ellipsis />
									</Pagination.Item>
								{:else}
									<Pagination.Item>
										<Pagination.Link {page} isActive={currentPage === page.value}>
											{page.value}
										</Pagination.Link>
									</Pagination.Item>
								{/if}
							{/each}
							<Pagination.Item>
								<Pagination.Next />
							</Pagination.Item>
						</Pagination.Content>
					{/snippet}
				</Pagination.Root>
			</div>
		{/if}
	</main>
</div>
