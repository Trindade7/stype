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
});
