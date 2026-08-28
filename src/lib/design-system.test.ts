import { describe, it, expect } from 'vitest';
import { cn } from './utils';
import fs from 'node:fs';
import path from 'node:path';

describe('Design System and Theme Configuration', () => {
	it('merges tailwind class names properly with cn utility', () => {
		expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
		expect(cn('text-zinc-500', false && 'text-zinc-900', 'text-teal-500')).toBe('text-teal-500');
	});

	it('configures shadcn components.json with Vega style and Zinc base', () => {
		const componentsConfigPath = path.resolve(process.cwd(), 'components.json');
		expect(fs.existsSync(componentsConfigPath)).toBe(true);

		const componentsConfig = JSON.parse(fs.readFileSync(componentsConfigPath, 'utf8'));
		expect(componentsConfig.style).toBe('vega');
		expect(componentsConfig.tailwind.baseColor).toBe('zinc');
		expect(componentsConfig.aliases.components).toBe('$lib/components');
		expect(componentsConfig.aliases.ui).toBe('$lib/components/ui');
	});

	it('defines required light and dark CSS variables in app.css', () => {
		const cssPath = path.resolve(process.cwd(), 'src/app.css');
		expect(fs.existsSync(cssPath)).toBe(true);

		const css = fs.readFileSync(cssPath, 'utf8');

		// Check font imports
		expect(css).toContain('@fontsource-variable/figtree');

		// Check light theme variables
		expect(css).toContain(':root');
		expect(css).toContain('--background:');
		expect(css).toContain('--foreground:');
		expect(css).toContain('--primary:');
		expect(css).toContain('--accent:');
		expect(css).toContain('--radius:');

		// Check dark theme variables
		expect(css).toContain('.dark');

		// Check font definition in @theme
		expect(css).toContain("--font-sans: 'Figtree Variable', sans-serif;");
	});

	it('defines semantic theme tokens for positive feedback, typing engine states, and form inputs in light and dark modes', () => {
		const cssPath = path.resolve(process.cwd(), 'src/app.css');
		const css = fs.readFileSync(cssPath, 'utf8');

		// Extract blocks
		const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
		expect(rootMatch).not.toBeNull();
		const rootBlock = rootMatch![1];

		const darkMatch = css.match(/\.dark\s*\{([^}]+)\}/);
		expect(darkMatch).not.toBeNull();
		const darkBlock = darkMatch![1];

		const themeMatch = css.match(/@theme inline\s*\{([^}]+)\}/);
		expect(themeMatch).not.toBeNull();
		const themeBlock = themeMatch![1];

		// Verify light theme semantic tokens
		expect(rootBlock).toContain('--success:');
		expect(rootBlock).toContain('--success-foreground:');
		expect(rootBlock).toContain('--typing-untyped:');
		expect(rootBlock).toContain('--typing-correct:');
		expect(rootBlock).toContain('--typing-error:');
		expect(rootBlock).toContain('--typing-caret:');
		expect(rootBlock).toContain('--border:');
		expect(rootBlock).toContain('--input:');

		// Verify dark theme semantic tokens
		expect(darkBlock).toContain('--success:');
		expect(darkBlock).toContain('--success-foreground:');
		expect(darkBlock).toContain('--typing-untyped:');
		expect(darkBlock).toContain('--typing-correct:');
		expect(darkBlock).toContain('--typing-error:');
		expect(darkBlock).toContain('--typing-caret:');
		expect(darkBlock).toContain('--border:');
		expect(darkBlock).toContain('--input:');

		// Verify registration in @theme inline
		expect(themeBlock).toContain('--color-success: var(--success);');
		expect(themeBlock).toContain('--color-success-foreground: var(--success-foreground);');
		expect(themeBlock).toContain('--color-typing-untyped: var(--typing-untyped);');
		expect(themeBlock).toContain('--color-typing-correct: var(--typing-correct);');
		expect(themeBlock).toContain('--color-typing-error: var(--typing-error);');
		expect(themeBlock).toContain('--color-typing-caret: var(--typing-caret);');
		expect(themeBlock).toContain('--color-input: var(--input);');
		expect(themeBlock).toContain('--color-border: var(--border);');
	});

	it('enforces refined input border contrast and preserves standard border in light theme', () => {
		const cssPath = path.resolve(process.cwd(), 'src/app.css');
		const css = fs.readFileSync(cssPath, 'utf8');

		const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
		const rootBlock = rootMatch![1];

		// Parse input lightness in :root for crisp input borders
		const inputMatch = rootBlock.match(/--input:\s*oklch\(\s*([\d.]+)/);
		expect(inputMatch).not.toBeNull();
		const inputLightness = parseFloat(inputMatch![1]);
		expect(inputLightness).toBeLessThanOrEqual(0.83);

		// Verify standard border token in :root
		expect(rootBlock).toContain('--border: oklch(0.92 0.004 286.32);');
	});

	it('configures scrollbar-gutter stable globally on html in app.css to prevent layout shifts', () => {
		const cssPath = path.resolve(process.cwd(), 'src/app.css');
		expect(fs.existsSync(cssPath)).toBe(true);

		const css = fs.readFileSync(cssPath, 'utf8');

		// Check global scrollbar gutter stabilization
		expect(css).toMatch(/html\s*\{[^}]*scrollbar-gutter:\s*stable[^}]*\}/s);
	});

	it('configures global slim scrollbars with transparent track, rounded thumbs, and hover contrast in app.css', () => {
		const cssPath = path.resolve(process.cwd(), 'src/app.css');
		const css = fs.readFileSync(cssPath, 'utf8');

		// Standard CSS scrollbar properties
		expect(css).toContain('scrollbar-width: thin;');
		expect(css).toContain('scrollbar-color: var(--border) transparent;');
		expect(css).toMatch(/\*:hover\s*\{[^}]*scrollbar-color:\s*var\(--muted-foreground\)\s*transparent/s);

		// WebKit pseudo-element scrollbar rules
		expect(css).toMatch(/::-webkit-scrollbar\s*\{[^}]*width:\s*6px;[^}]*height:\s*6px;/s);
		expect(css).toMatch(/::-webkit-scrollbar-track\s*\{[^}]*background:\s*transparent;/s);
		expect(css).toMatch(
			/::-webkit-scrollbar-thumb\s*\{[^}]*background-color:\s*var\(--border\);[^}]*border-radius:/s
		);
		expect(css).toMatch(
			/::-webkit-scrollbar-thumb:hover\s*\{[^}]*background-color:\s*var\(--muted-foreground\);/s
		);
	});

	it('configures pointer cursor for buttons, links, and button roles, and not-allowed cursor when disabled in app.css', () => {
		const cssPath = path.resolve(process.cwd(), 'src/app.css');
		const css = fs.readFileSync(cssPath, 'utf8');

		// Pointer cursor for interactive elements
		expect(css).toMatch(/(?:button|a|\[role=['"]?button['"]?)[^;{}]*\{\s*cursor:\s*pointer;/s);

		// Not-allowed cursor for disabled elements
		expect(css).toMatch(
			/(?:button:disabled|\[role=['"]?button['"]?\]:disabled|\[role=['"]?button['"]?\]\[aria-disabled=['"]?true['"]?\]|a\[aria-disabled=['"]?true['"]?\])[^;{}]*\{\s*cursor:\s*not-allowed;/s
		);
	});

	it('configures chart tokens in app.css with high-contrast legibility in light mode and registers them in theme inline', () => {
		const cssPath = path.resolve(process.cwd(), 'src/app.css');
		const css = fs.readFileSync(cssPath, 'utf8');

		const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
		expect(rootMatch).not.toBeNull();
		const rootBlock = rootMatch![1];

		const darkMatch = css.match(/\.dark\s*\{([^}]+)\}/);
		expect(darkMatch).not.toBeNull();
		const darkBlock = darkMatch![1];

		const themeMatch = css.match(/@theme inline\s*\{([^}]+)\}/);
		expect(themeMatch).not.toBeNull();
		const themeBlock = themeMatch![1];

		// In light mode, chart lines must have sufficient darkness (lightness <= 0.65) for contrast on white
		const chart1Match = rootBlock.match(/--chart-1:\s*oklch\(\s*([\d.]+)/);
		expect(chart1Match).not.toBeNull();
		const chart1Lightness = parseFloat(chart1Match![1]);
		expect(chart1Lightness).toBeLessThanOrEqual(0.65);

		const chart2Match = rootBlock.match(/--chart-2:\s*oklch\(\s*([\d.]+)/);
		expect(chart2Match).not.toBeNull();
		const chart2Lightness = parseFloat(chart2Match![1]);
		expect(chart2Lightness).toBeLessThanOrEqual(0.65);

		// Dark mode has chart tokens defined
		expect(darkBlock).toContain('--chart-1:');
		expect(darkBlock).toContain('--chart-2:');

		// @theme inline registers chart colors
		expect(themeBlock).toContain('--color-chart-1: var(--chart-1);');
		expect(themeBlock).toContain('--color-chart-2: var(--chart-2);');
	});
});
