/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import SettingsForm from './SettingsForm.svelte';

describe('SettingsForm Component', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders form inputs populated with provided settings', () => {
		render(SettingsForm, {
			settings: {
				mode: 'timed',
				duration: 60,
				passageLength: 'medium',
				zenMode: true,
				theme: 'dark'
			}
		});

		expect(screen.getByLabelText(/passage mode/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/timed mode/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/default duration/i)).toHaveValue('60');
		expect(screen.getByLabelText(/preferred passage length/i)).toHaveValue('medium');
		expect(screen.getByLabelText(/visual theme/i)).toHaveValue('dark');
		expect(screen.getByLabelText(/zen mode/i)).toBeChecked();
	});

	it('calls onSave callback when submitted and displays success', async () => {
		const onSave = vi.fn().mockResolvedValue({ success: true });
		render(SettingsForm, {
			settings: {
				mode: 'passage',
				duration: 30,
				passageLength: 'all',
				zenMode: false,
				theme: 'system'
			},
			onSave
		});

		const timedRadio = screen.getByLabelText(/timed mode/i);
		await fireEvent.click(timedRadio);

		const saveButton = screen.getByRole('button', { name: /save settings/i });
		await fireEvent.click(saveButton);

		expect(onSave).toHaveBeenCalledTimes(1);
		expect(onSave).toHaveBeenCalledWith({
			mode: 'timed',
			duration: 30,
			passageLength: 'all',
			zenMode: false,
			theme: 'system'
		});

		expect(await screen.findByText(/settings saved successfully/i)).toBeInTheDocument();
	});

	it('renders pure client-side form without POST method/action when onSave is provided', () => {
		const onSave = vi.fn();
		render(SettingsForm, {
			settings: {
				mode: 'passage',
				duration: 30,
				passageLength: 'all',
				zenMode: false,
				theme: 'system'
			},
			onSave
		});

		const form = document.querySelector('form');
		expect(form).not.toBeNull();
		expect(form).not.toHaveAttribute('method', 'POST');
		expect(form).not.toHaveAttribute('action');
	});

	it('renders server-backed form with POST method and action when onSave is not provided', () => {
		render(SettingsForm, {
			settings: {
				mode: 'passage',
				duration: 30,
				passageLength: 'all',
				zenMode: false,
				theme: 'system'
			},
			action: '?/save'
		});

		const form = document.querySelector('form');
		expect(form).not.toBeNull();
		expect(form).toHaveAttribute('method', 'POST');
		expect(form).toHaveAttribute('action', '?/save');
	});
});
