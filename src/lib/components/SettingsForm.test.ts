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
		expect(screen.getByRole('button', { name: /default duration/i })).toHaveTextContent('60 seconds');
		expect(screen.getByRole('button', { name: /preferred passage length/i })).toHaveTextContent('Medium (50–100 words)');
		expect(screen.getByRole('button', { name: /visual theme/i })).toHaveTextContent('Dark');
		expect(screen.getByRole('switch', { name: /zen mode/i })).toHaveAttribute('aria-checked', 'true');
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

	it('renders server-backed form with inputs for form actions when onSave is not provided', () => {
		render(SettingsForm, {
			settings: {
				mode: 'timed',
				duration: 60,
				passageLength: 'medium',
				zenMode: true,
				theme: 'dark'
			},
			action: '?/save'
		});

		const form = document.querySelector('form');
		expect(form).not.toBeNull();
		expect(form).toHaveAttribute('method', 'POST');
		expect(form).toHaveAttribute('action', '?/save');

		// Inputs for bits-ui primitives supporting form actions
		expect(document.querySelector('input[name="mode"]')).toHaveValue('timed');
		expect(document.querySelector('input[name="duration"]')).toHaveValue('60');
		expect(document.querySelector('input[name="passageLength"]')).toHaveValue('medium');
		expect(document.querySelector('input[name="theme"]')).toHaveValue('dark');
		const zenInput = document.querySelector('input[name="zenMode"]') as HTMLInputElement;
		expect(zenInput).not.toBeNull();
		expect(zenInput.checked).toBe(true);
	});

	it('displays error notification when form error is provided or onSave fails', async () => {
		render(SettingsForm, {
			settings: {
				mode: 'passage',
				duration: 30,
				passageLength: 'all',
				zenMode: false,
				theme: 'system'
			},
			form: { error: 'Server validation error' }
		});

		expect(screen.getByText('Server validation error')).toBeInTheDocument();
	});

	it('handles onSave error response correctly', async () => {
		const onSave = vi.fn().mockResolvedValue({ error: 'Custom save failure' });
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

		const saveButton = screen.getByRole('button', { name: /save settings/i });
		await fireEvent.click(saveButton);

		expect(await screen.findByText('Custom save failure')).toBeInTheDocument();
	});
});
