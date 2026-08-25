<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import * as Pagination from '$lib/components/ui/pagination';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { PlusIcon, Edit01Icon, Delete01Icon } from '@hugeicons/core-free-icons';
	import { getPassageLength } from '$lib/passage-utils';

	let { data, form } = $props();

	let isCreateOpen = $state(false);
	let editingId = $state<number | null>(null);
	let currentPage = $state(1);

	let paginatedPassages = $derived(data.passages.slice((currentPage - 1) * 10, currentPage * 10));

	$effect(() => {
		const totalPages = Math.max(1, Math.ceil(data.passages.length / 10));
		if (currentPage > totalPages) {
			currentPage = totalPages;
		}
	});

	function displayPassageLength(text: string) {
		const len = getPassageLength(text);
		return len.charAt(0).toUpperCase() + len.slice(1);
	}
</script>

<div class="mx-auto max-w-5xl px-6 py-8">
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
				
				<form method="POST" action="?/create" use:enhance={() => {
					return async ({ update }) => {
						isCreateOpen = false;
						await update();
					};
				}}>
					<div class="grid gap-4 py-4">
						<div class="grid gap-2">
							<Label for="text">Text</Label>
							<Textarea id="text" name="text" required class="min-h-[120px]" placeholder="Type or paste passage text here..." />
						</div>
						<div class="grid gap-2">
							<Label for="source">Source (Optional)</Label>
							<Input id="source" name="source" placeholder="e.g. 1984, George Orwell" />
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

	{#if form?.error}
		<div class="mb-6 rounded-md bg-destructive/15 p-4 text-sm text-destructive">
			{form.error}
		</div>
	{/if}

	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each paginatedPassages as passage}
			<Card.Root>
				<Card.Header class="pb-3">
					<div class="flex items-start justify-between gap-2">
						<div class="flex items-center gap-2">
							{#if passage.userId === null}
								<Badge variant="secondary">Seeded</Badge>
							{:else}
								<Badge>Custom</Badge>
							{/if}
							<Badge variant="outline">{displayPassageLength(passage.text)}</Badge>
						</div>
						
						{#if passage.userId !== null}
							<div class="flex items-center gap-1">
								<Dialog.Root open={editingId === passage.id} onOpenChange={(open) => { if(!open) editingId = null; else editingId = passage.id; }}>
									<Dialog.Trigger aria-label="Edit passage" class={buttonVariants({ variant: 'ghost', size: 'icon' }) + " h-8 w-8"}>
										<HugeiconsIcon icon={Edit01Icon} size={16} />
									</Dialog.Trigger>
									<Dialog.Content>
										<Dialog.Header>
											<Dialog.Title>Edit Passage</Dialog.Title>
										</Dialog.Header>
										<form method="POST" action="?/update" use:enhance={() => {
											return async ({ update }) => {
												editingId = null;
												await update();
											};
										}}>
											<input type="hidden" name="id" value={passage.id} />
											<div class="grid gap-4 py-4">
												<div class="grid gap-2">
													<Label for="edit-text">Text</Label>
													<Textarea id="edit-text" name="text" required class="min-h-[120px]" value={passage.text} />
												</div>
												<div class="grid gap-2">
													<Label for="edit-source">Source</Label>
													<Input id="edit-source" name="source" value={passage.source ?? ''} />
												</div>
											</div>
											<Dialog.Footer>
												<Button type="button" variant="outline" onclick={() => editingId = null}>Cancel</Button>
												<Button type="submit">Save Changes</Button>
											</Dialog.Footer>
										</form>
									</Dialog.Content>
								</Dialog.Root>

								<form method="POST" action="?/delete" use:enhance>
									<input type="hidden" name="id" value={passage.id} />
									<Button type="submit" variant="ghost" size="icon" aria-label="Delete passage" class="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
										<HugeiconsIcon icon={Delete01Icon} size={16} />
									</Button>
								</form>
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

	{#if data.passages.length > 10}
		<div class="mt-6">
			<Pagination.Root count={data.passages.length} perPage={10} bind:page={currentPage}>
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
</div>
