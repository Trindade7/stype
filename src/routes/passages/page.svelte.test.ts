/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import GuestPassagesPage from './+page.svelte';
import {
	localStore,
	saveCustomPassage,
	getCustomPassages,
	DEFAULT_PASSAGES
} from '$lib/localStore';
import { setAdapter, resetMigrationStatus } from '$lib/storage';
import { syncController } from '$lib/sync';

describe('Guest Passages Route (/passages/+page.svelte)', () => {
	beforeEach(async () => {
		localStorage.clear();
		resetMigrationStatus();
		if (typeof indexedDB !== 'undefined') {
			await new Promise<void>((resolve, reject) => {
				const req = indexedDB.deleteDatabase('stype_db');
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
				req.onblocked = () => resolve();
			});
		}
		setAdapter(null);
		vi.restoreAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it('renders header with navigation links and passages page heading', () => {
		render(GuestPassagesPage);

		// Brand & Navigation
		expect(screen.getByText('stype')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /history/i })).toHaveAttribute('href', '/history');
		expect(screen.getByRole('link', { name: /stats/i })).toHaveAttribute('href', '/stats');
		expect(screen.getByRole('link', { name: /passages/i })).toHaveAttribute('href', '/passages');
		expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
		expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/app/login');

		// Page Heading
		expect(screen.getByRole('heading', { level: 1, name: 'Passages' })).toBeInTheDocument();
		expect(
			screen.getByText(/Manage your custom typing practice passages/i)
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /new passage/i })).toBeInTheDocument();
	});

	it('displays default seeded passages with Seeded badge', async () => {
		render(GuestPassagesPage);

		const seededBadges = await screen.findAllByText('Seeded');
		expect(seededBadges.length).toBe(DEFAULT_PASSAGES.length);

		expect(screen.getByText(DEFAULT_PASSAGES[0].text)).toBeInTheDocument();
		expect(screen.getByText(DEFAULT_PASSAGES[0].source!)).toBeInTheDocument();
	});

	it('displays custom passages with Custom badge and delete button', async () => {
		await saveCustomPassage({
			text: 'A custom passage created for testing.',
			source: 'Custom Test Source'
		});

		render(GuestPassagesPage);

		expect(await screen.findByText('Custom')).toBeInTheDocument();
		expect(screen.getByText('Custom Test Source')).toBeInTheDocument();
		expect(screen.getByText('A custom passage created for testing.')).toBeInTheDocument();
	});

	it('creates a new custom passage and displays it in the list', async () => {
		render(GuestPassagesPage);

		// Open Create dialog
		const newPassageButton = await screen.findByRole('button', { name: /new passage/i });
		await fireEvent.click(newPassageButton);

		expect(screen.getByRole('heading', { level: 2, name: /create custom passage/i })).toBeInTheDocument();

		// Fill in form
		const textArea = screen.getByPlaceholderText(/type or paste passage text here/i);
		const sourceInput = screen.getByPlaceholderText(/e\.g\. 1984, George Orwell/i);

		await fireEvent.input(textArea, {
			target: { value: 'My newly created custom practice passage.' }
		});
		await fireEvent.input(sourceInput, {
			target: { value: 'Original Source' }
		});

		// Submit form
		const submitButton = screen.getByRole('button', { name: /create passage/i });
		await fireEvent.click(submitButton);

		// Verify passage is rendered in page
		expect(await screen.findByText('Original Source')).toBeInTheDocument();
		expect(screen.getByText('My newly created custom practice passage.')).toBeInTheDocument();

		// Verify stored in localStore
		const stored = await getCustomPassages();
		expect(stored).toHaveLength(1);
		expect(stored[0].text).toBe('My newly created custom practice passage.');
		expect(stored[0].source).toBe('Original Source');
	});

	it('deletes a custom passage when delete button is clicked', async () => {
		await saveCustomPassage({
			text: 'Passage to be deleted.',
			source: 'Ephemeral Source'
		});

		render(GuestPassagesPage);

		expect(await screen.findByText('Ephemeral Source')).toBeInTheDocument();

		// Find delete button
		const deleteButton = screen.getByRole('button', { name: /delete passage/i });
		await fireEvent.click(deleteButton);

		// Verify passage is removed
		await waitFor(() => {
			expect(screen.queryByText('Ephemeral Source')).not.toBeInTheDocument();
		});
		expect(await getCustomPassages()).toHaveLength(0);
	});

	it('edits a custom passage when edit form is submitted', async () => {
		await saveCustomPassage({
			text: 'Initial text content.',
			source: 'Initial Source'
		});

		render(GuestPassagesPage);

		expect(await screen.findByText('Initial Source')).toBeInTheDocument();

		// Open edit dialog
		const editButton = screen.getByRole('button', { name: /edit passage/i });
		await fireEvent.click(editButton);

		expect(screen.getByRole('heading', { level: 2, name: /edit passage/i })).toBeInTheDocument();

		const editText = screen.getByLabelText(/^text$/i);
		const editSource = screen.getByLabelText(/^source$/i);

		await fireEvent.input(editText, { target: { value: 'Modified text content.' } });
		await fireEvent.input(editSource, { target: { value: 'Modified Source' } });

		const saveButton = screen.getByRole('button', { name: /save changes/i });
		await fireEvent.click(saveButton);

		expect(await screen.findByText('Modified Source')).toBeInTheDocument();
		expect(screen.getByText('Modified text content.')).toBeInTheDocument();

		const stored = await getCustomPassages();
		expect(stored[0].text).toBe('Modified text content.');
		expect(stored[0].source).toBe('Modified Source');
	});

	it('paginates when passages exceed 10 items', async () => {
		// DEFAULT_PASSAGES has 7. Add 5 custom passages to total 12.
		for (let i = 1; i <= 5; i++) {
			await saveCustomPassage({
				text: `Extra custom passage number ${i}`,
				source: `Custom Source ${i}`
			});
		}

		render(GuestPassagesPage);

		// Page 1 should show initial items
		expect(await screen.findByText(DEFAULT_PASSAGES[0].source!)).toBeInTheDocument();
		expect(screen.getByText('Custom Source 3')).toBeInTheDocument(); // 7 + 3 = 10
		expect(screen.queryByText('Custom Source 4')).not.toBeInTheDocument(); // 11th item

		const prevButton = screen.getByRole('button', { name: /previous/i });
		const nextButton = screen.getByRole('button', { name: /next/i });

		expect(prevButton).toBeDisabled();
		expect(nextButton).not.toBeDisabled();

		// Click Next
		await fireEvent.click(nextButton);

		// Page 2 shows items 11 and 12
		await waitFor(() => {
			expect(screen.queryByText(DEFAULT_PASSAGES[0].source!)).not.toBeInTheDocument();
		});
		expect(screen.getByText('Custom Source 4')).toBeInTheDocument();
		expect(screen.getByText('Custom Source 5')).toBeInTheDocument();

		expect(prevButton).not.toBeDisabled();
		expect(nextButton).toBeDisabled();
	});

	it('renders a Practice button for each passage card linking to /?passageId=<id>', async () => {
		render(GuestPassagesPage);

		const practiceLinks = await screen.findAllByRole('link', { name: /^practice$/i });
		expect(practiceLinks.length).toBe(DEFAULT_PASSAGES.length);

		DEFAULT_PASSAGES.forEach((passage, idx) => {
			expect(practiceLinks[idx]).toHaveAttribute('href', `/?passageId=${passage.id}`);
		});
	});

	it('shows clean loading indicator while passages load from store', () => {
		vi.spyOn(localStore, 'getAllPassages').mockReturnValue(new Promise(() => {}));

		render(GuestPassagesPage);

		expect(screen.getByTestId('passages-loading')).toBeInTheDocument();
		expect(screen.getByText(/loading passages/i)).toBeInTheDocument();
	});

	it('updates passages list dynamically when real-time custom passage update is received without page reload', async () => {
		render(GuestPassagesPage);

		expect(await screen.findByText(DEFAULT_PASSAGES[0].text)).toBeInTheDocument();
		expect(screen.queryByText('Realtime incoming passage text')).not.toBeInTheDocument();

		await saveCustomPassage({
			id: 'realtime-p-99',
			text: 'Realtime incoming passage text',
			source: 'Realtime Device'
		});

		(syncController as any).notifyDataChange({
			type: 'customPassages',
			data: [{ id: 'realtime-p-99', text: 'Realtime incoming passage text' }]
		});

		expect(await screen.findByText('Realtime incoming passage text')).toBeInTheDocument();
		expect(screen.getByText('Realtime Device')).toBeInTheDocument();
	});
});
