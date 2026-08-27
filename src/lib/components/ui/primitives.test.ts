/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { Button, buttonVariants } from './button';
import { Input } from './input';
import { Label } from './label';
import * as Card from './card';
import { Textarea } from './textarea';
import { Switch } from './switch';
import { Checkbox } from './checkbox';
import * as RadioGroup from './radio-group';
import * as Select from './select';
import { Calendar } from './calendar';
import * as Popover from './popover';

function createSnippet(text: string) {
	return createRawSnippet(() => ({
		render: () => `<span>${text}</span>`
	}));
}

describe('UI Primitives', () => {
	afterEach(() => {
		cleanup();
	});

	describe('Button Primitive', () => {
		it('renders a button element with default styles', () => {
			render(Button, { props: { children: createSnippet('Click Me') } });
			const btn = screen.getByRole('button', { name: /click me/i });
			expect(btn).toBeInTheDocument();
			expect(btn).toHaveAttribute('data-slot', 'button');
			expect(btn).toHaveAttribute('type', 'button');
		});

		it('renders an anchor element when href is provided', () => {
			render(Button, { props: { href: '/test-link', children: createSnippet('Link Button') } });
			const link = screen.getByRole('link', { name: /link button/i });
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute('href', '/test-link');
			expect(link).toHaveAttribute('data-slot', 'button');
		});

		it('supports variants and sizes via buttonVariants utility', () => {
			const outlineClasses = buttonVariants({ variant: 'outline', size: 'sm' });
			expect(outlineClasses).toContain('border-border');
			expect(outlineClasses).toContain('h-8');

			const destructiveClasses = buttonVariants({ variant: 'destructive', size: 'lg' });
			expect(destructiveClasses).toContain('text-destructive');
			expect(destructiveClasses).toContain('h-10');
		});

		it('applies disabled attributes correctly', () => {
			render(Button, { props: { disabled: true, children: createSnippet('Disabled') } });
			const btn = screen.getByRole('button', { name: /disabled/i });
			expect(btn).toBeDisabled();
		});

		it('applies cursor-pointer by default and not-allowed cursor when disabled', async () => {
			const activeClasses = buttonVariants();
			expect(activeClasses).toContain('cursor-pointer');
			expect(activeClasses).toContain('disabled:cursor-not-allowed');
			expect(activeClasses).toContain('aria-disabled:cursor-not-allowed');

			// Check anchor button with disabled
			const clickSpy = vi.fn();
			render(Button, {
				props: {
					href: '/disabled-link',
					disabled: true,
					onclick: clickSpy,
					children: createSnippet('Disabled Link')
				}
			});
			const disabledLink = screen.getByText('Disabled Link').closest('a');
			expect(disabledLink).toBeInTheDocument();
			expect(disabledLink).toHaveAttribute('aria-disabled', 'true');
			expect(disabledLink).toHaveClass('aria-disabled:cursor-not-allowed');

			// Verify pointer interactions are prevented
			await fireEvent.click(disabledLink!);
			expect(clickSpy).not.toHaveBeenCalled();
		});
	});

	describe('Input Primitive', () => {
		it('renders an input element with default type and custom attributes', () => {
			render(Input, {
				props: {
					type: 'text',
					placeholder: 'Enter username',
					id: 'test-input',
					name: 'username'
				}
			});

			const input = screen.getByPlaceholderText('Enter username');
			expect(input).toBeInTheDocument();
			expect(input).toHaveAttribute('type', 'text');
			expect(input).toHaveAttribute('id', 'test-input');
			expect(input).toHaveAttribute('name', 'username');
			expect(input).toHaveAttribute('data-slot', 'input');
		});

		it('renders password input type correctly', () => {
			render(Input, {
				props: {
					type: 'password',
					placeholder: 'Enter password'
				}
			});

			const input = screen.getByPlaceholderText('Enter password');
			expect(input).toBeInTheDocument();
			expect(input).toHaveAttribute('type', 'password');
		});
	});

	describe('Label Primitive', () => {
		it('renders a label element with data-slot and for attribute', () => {
			render(Label, {
				props: {
					for: 'test-input',
					children: createSnippet('Username Label')
				}
			});

			const labelSpan = screen.getByText('Username Label');
			const label = labelSpan.closest('label');
			expect(label).toBeInTheDocument();
			expect(label).toHaveAttribute('data-slot', 'label');
			expect(label).toHaveAttribute('for', 'test-input');
		});
	});

	describe('Card Primitives', () => {
		it('renders card root with data-slot', () => {
			render(Card.Root, {
				props: {
					children: createSnippet('Card Root Content')
				}
			});

			const cardContent = screen.getByText('Card Root Content');
			const card = cardContent.closest('[data-slot="card"]');
			expect(card).toBeInTheDocument();
			expect(card).toHaveAttribute('data-size', 'default');
		});

		it('renders individual card subcomponents correctly', () => {
			render(Card.Header, { props: { children: createSnippet('Header') } });
			expect(screen.getByText('Header').closest('[data-slot="card-header"]')).toBeInTheDocument();

			render(Card.Title, { props: { children: createSnippet('Title') } });
			expect(screen.getByText('Title').closest('[data-slot="card-title"]')).toBeInTheDocument();

			render(Card.Description, { props: { children: createSnippet('Description') } });
			expect(screen.getByText('Description').closest('[data-slot="card-description"]')).toBeInTheDocument();

			render(Card.Content, { props: { children: createSnippet('Content') } });
			expect(screen.getByText('Content').closest('[data-slot="card-content"]')).toBeInTheDocument();

			render(Card.Footer, { props: { children: createSnippet('Footer') } });
			expect(screen.getByText('Footer').closest('[data-slot="card-footer"]')).toBeInTheDocument();

			render(Card.Action, { props: { children: createSnippet('Action') } });
			expect(screen.getByText('Action').closest('[data-slot="card-action"]')).toBeInTheDocument();
		});
	});

	describe('Textarea Primitive', () => {
		it('renders a textarea with data-slot and custom attributes', () => {
			render(Textarea, {
				props: {
					placeholder: 'Type something here...',
					id: 'test-textarea',
					name: 'notes',
					rows: 4
				}
			});

			const textarea = screen.getByPlaceholderText('Type something here...');
			expect(textarea).toBeInTheDocument();
			expect(textarea).toHaveAttribute('id', 'test-textarea');
			expect(textarea).toHaveAttribute('name', 'notes');
			expect(textarea).toHaveAttribute('data-slot', 'textarea');
		});
	});

	describe('Switch Primitive', () => {
		it('renders switch with data-slot and handles checked state', () => {
			render(Switch, {
				props: {
					id: 'test-switch',
					name: 'notifications',
					checked: true
				}
			});

			const switchEl = screen.getByRole('switch');
			expect(switchEl).toBeInTheDocument();
			expect(switchEl).toHaveAttribute('data-slot', 'switch');
			expect(switchEl).toHaveAttribute('aria-checked', 'true');
		});
	});

	describe('Checkbox Primitive', () => {
		it('renders checkbox with data-slot and handles checked state', () => {
			render(Checkbox, {
				props: {
					id: 'test-checkbox',
					name: 'agree',
					checked: true
				}
			});

			const checkbox = screen.getByRole('checkbox');
			expect(checkbox).toBeInTheDocument();
			expect(checkbox).toHaveAttribute('data-slot', 'checkbox');
			expect(checkbox).toHaveAttribute('aria-checked', 'true');
		});
	});

	describe('RadioGroup Primitives', () => {
		it('renders radio group root with data-slot', () => {
			render(RadioGroup.Root, {
				props: {
					value: 'option1',
					name: 'test-group',
					children: createSnippet('Radio Group Content')
				}
			});

			const groupContent = screen.getByText('Radio Group Content');
			const group = groupContent.closest('[data-slot="radio-group"]');
			expect(group).toBeInTheDocument();
		});
	});

	describe('Select Primitives', () => {
		it('renders select root with trigger and data-slot', () => {
			const selectSnippet = createRawSnippet(() => ({
				render: () => `
					<button type="button" data-slot="select-trigger">
						<span>Select Option</span>
					</button>
				`
			}));

			render(Select.Root, {
				props: {
					type: 'single',
					value: 'option1',
					children: selectSnippet
				}
			});

			const trigger = screen.getByText('Select Option');
			expect(trigger).toBeInTheDocument();
		});
	});

	describe('Calendar Primitive', () => {
		it('renders calendar component with navigation buttons', () => {
			render(Calendar, {
				props: {
					type: 'single'
				}
			});

			const prevBtn = screen.getByRole('button', { name: /previous/i });
			const nextBtn = screen.getByRole('button', { name: /next/i });
			expect(prevBtn).toBeInTheDocument();
			expect(nextBtn).toBeInTheDocument();
		});
	});

	describe('Popover Primitive', () => {
		it('renders popover root with trigger element', () => {
			const popoverSnippet = createRawSnippet(() => ({
				render: () => `
					<button type="button" data-slot="popover-trigger">Open Popover</button>
				`
			}));

			render(Popover.Root, {
				props: {
					children: popoverSnippet
				}
			});

			expect(screen.getByText('Open Popover')).toBeInTheDocument();
		});
	});
});
