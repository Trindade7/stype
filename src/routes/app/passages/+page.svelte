<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { PlusIcon, Edit01Icon, Delete01Icon } from '@hugeicons/core-free-icons';
	import { getPassageLength } from '$lib/passage-utils';

	let { data, form } = $props();

	let isCreateOpen = $state(false);
	let editingId = $state<number | null>(null);

	const textareaClass = "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

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
							<textarea id="text" name="text" required class={textareaClass} placeholder="Type or paste passage text here..."></textarea>
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
		{#each data.passages as passage}
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
									<Dialog.Trigger class={buttonVariants({ variant: 'ghost', size: 'icon' }) + " h-8 w-8"}>
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
													<textarea id="edit-text" name="text" required class={textareaClass}>{passage.text}</textarea>
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
									<Button type="submit" variant="ghost" size="icon" class="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
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
</div>
