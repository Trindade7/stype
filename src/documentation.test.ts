import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

describe('Documentation Suite', () => {
	const projectRoot = resolve(__dirname, '..');

	const docFiles = [
		'README.md',
		'docs/deployment.md',
		'docs/installation.md',
		'docs/development.md'
	];

	it('ensures all core documentation files exist and have substantial content', () => {
		for (const file of docFiles) {
			const filePath = join(projectRoot, file);
			expect(existsSync(filePath), `Expected ${file} to exist`).toBe(true);
			const content = readFileSync(filePath, 'utf-8');
			expect(content.trim().length, `Expected ${file} to have content`).toBeGreaterThan(300);
		}
	});

	it('validates required headers in root README.md', () => {
		const content = readFileSync(join(projectRoot, 'README.md'), 'utf-8');
		const requiredHeaders = [
			'# Stype',
			'## Features',
			'## Quick start',
			'### Run locally',
			'### Self-host with Docker',
			'## Documentation',
			'## Architecture',
			'## License'
		];
		for (const header of requiredHeaders) {
			expect(content).toContain(header);
		}
	});

	it('validates required content in root README.md', () => {
		const content = readFileSync(join(projectRoot, 'README.md'), 'utf-8');
		const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));

		// Official tagline
		expect(content).toContain(pkg.description);

		// Core features
		expect(content).toMatch(/passage and timed modes/i);
		expect(content).toMatch(/offline guest mode/i);
		expect(content).toMatch(/multi-user sync/i);
		expect(content).toMatch(/live metrics|hud/i);
		expect(content).toMatch(/performance charts|statistics/i);

		// Quick start instructions
		expect(content).toContain('pnpm dev');
		expect(content).toContain('docker compose up -d');

		// Guide references
		expect(content).toContain('docs/deployment.md');
		expect(content).toContain('docs/installation.md');
		expect(content).toContain('docs/development.md');
		expect(content).toContain('LICENSE');
	});

	it('validates required headers and sections in docs/deployment.md', () => {
		const content = readFileSync(join(projectRoot, 'docs/deployment.md'), 'utf-8');
		const requiredHeaders = [
			'# Deployment guide',
			'## System requirements',
			'## Docker Compose deployment',
			'## Bare-metal Node.js deployment',
			'## Reverse proxy configuration',
			'### Caddy',
			'### Nginx',
			'## Email delivery configuration',
			'## Environment variables reference',
			'## Database backups and maintenance',
			'### Create a hot backup',
			'### Restore from backup'
		];
		for (const header of requiredHeaders) {
			expect(content, `Missing header "${header}" in docs/deployment.md`).toContain(header);
		}
	});

	it('validates environment variable reference completeness in docs/deployment.md', () => {
		const content = readFileSync(join(projectRoot, 'docs/deployment.md'), 'utf-8');
		const envExample = readFileSync(join(projectRoot, '.env.example'), 'utf-8');

		// Extract all variable names from .env.example (lines like VAR_NAME=...)
		const varMatches = envExample.match(/^[A-Z0-9_]+(?==)/gm) || [];
		expect(varMatches.length).toBeGreaterThan(5);

		for (const varName of varMatches) {
			expect(content, `Missing env var ${varName} in docs/deployment.md`).toContain(`\`${varName}\``);
		}
	});

	it('validates required headers and sections in docs/installation.md', () => {
		const content = readFileSync(join(projectRoot, 'docs/installation.md'), 'utf-8');
		const requiredHeaders = [
			'# Installation guide',
			'## Desktop application',
			'### Download pre-built releases',
			'### Build desktop binaries from source',
			'## Static web application',
			'### Build static assets',
			'### Host on Cloudflare Pages',
			'### Host on Vercel',
			'### Host with Nginx or static file servers',
			'## Remote synchronization'
		];
		for (const header of requiredHeaders) {
			expect(content, `Missing header "${header}" in docs/installation.md`).toContain(header);
		}

		// Verify platforms and sync topics
		expect(content).toMatch(/linux/i);
		expect(content).toMatch(/macos/i);
		expect(content).toMatch(/windows/i);
		expect(content).toMatch(/tauri/i);
		expect(content).toMatch(/link account|link a self-hosted account/i);
		expect(content).toMatch(/unlink account/i);
	});

	it('validates required headers and sections in docs/development.md', () => {
		const content = readFileSync(join(projectRoot, 'docs/development.md'), 'utf-8');
		const requiredHeaders = [
			'# Development guide',
			'## Prerequisites',
			'## Getting started',
			'## Project structure',
			'## Available scripts',
			'## Testing and verification',
			'## Contribution conventions'
		];
		for (const header of requiredHeaders) {
			expect(content, `Missing header "${header}" in docs/development.md`).toContain(header);
		}

		// Verify commands and conventions
		expect(content).toContain('pnpm dev');
		expect(content).toContain('pnpm test');
		expect(content).toContain('pnpm check');
		expect(content).toMatch(/conventional commits/i);
		expect(content).toMatch(/branch/i);
	});

	it('validates all relative links and internal anchor references across all documentation files', () => {
		for (const file of docFiles) {
			const filePath = join(projectRoot, file);
			const content = readFileSync(filePath, 'utf-8');

			// Match markdown links: [text](href)
			const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
			let match;
			while ((match = linkRegex.exec(content)) !== null) {
				const href = match[2].trim();

				// Skip external urls and mailto links
				if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
					continue;
				}

				const [pathPart, anchorPart] = href.split('#');
				const targetPath = pathPart
					? resolve(join(projectRoot, file, '..'), pathPart)
					: filePath;

				expect(existsSync(targetPath), `Broken link in ${file}: "${href}" -> ${targetPath} does not exist`).toBe(true);

				if (anchorPart) {
					const targetContent = readFileSync(targetPath, 'utf-8');
					// Convert headers in target file to slug format
					const headerRegex = /^#{1,6}\s+(.+)$/gm;
					const slugs: string[] = [];
					let headerMatch;
					while ((headerMatch = headerRegex.exec(targetContent)) !== null) {
						const headerTitle = headerMatch[1].trim();
						const slug = headerTitle
							.toLowerCase()
							.replace(/[^\w\s-]/g, '')
							.replace(/\s+/g, '-');
						slugs.push(slug);
					}
					expect(
						slugs.includes(anchorPart.toLowerCase()),
						`Broken anchor in ${file}: "${href}". Target slug "${anchorPart}" not found in ${targetPath}`
					).toBe(true);
				}
			}
		}
	});

	it('ensures documentation adheres to unslop rules (no em dashes, no AI tells)', () => {
		const aiBannedWords = [
			'additionally',
			'crucial',
			'delve',
			'enduring',
			'fostering',
			'garner',
			'interplay',
			'intricate',
			'landscape',
			'pivotal',
			'showcase',
			'tapestry',
			'testament',
			'underscore',
			'vibrant'
		];

		for (const file of docFiles) {
			const content = readFileSync(join(projectRoot, file), 'utf-8');

			// No em-dashes (— \u2014) or en-dashes (– \u2013)
			expect(content).not.toMatch(/[\u2013\u2014]/);

			// Check for AI buzzwords as standalone words
			for (const word of aiBannedWords) {
				const regex = new RegExp(`\\b${word}\\b`, 'i');
				expect(content, `Found banned word "${word}" in ${file}`).not.toMatch(regex);
			}
		}
	});
});
