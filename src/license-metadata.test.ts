import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

describe('Open Source Licensing and Package Metadata', () => {
	const projectRoot = resolve(__dirname, '..');

	describe('LICENSE', () => {
		const licensePath = join(projectRoot, 'LICENSE');

		it('exists at the project root', () => {
			expect(existsSync(licensePath)).toBe(true);
		});

		it('contains the standard MIT license header and copyright notice', () => {
			const content = readFileSync(licensePath, 'utf-8');
			expect(content).toContain('MIT License');
			expect(content).toContain('Copyright (c) 2025 Trindade Jose');
		});

		it('contains the full standard MIT license permission and disclaimer text', () => {
			const content = readFileSync(licensePath, 'utf-8');
			expect(content).toContain('Permission is hereby granted, free of charge, to any person obtaining a copy');
			expect(content).toContain('The above copyright notice and this permission notice shall be included in all');
			expect(content).toContain('THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND');
		});
	});

	describe('package.json metadata', () => {
		const pkgPath = join(projectRoot, 'package.json');

		it('exists and is valid JSON', () => {
			expect(existsSync(pkgPath)).toBe(true);
			expect(() => JSON.parse(readFileSync(pkgPath, 'utf-8'))).not.toThrow();
		});

		it('contains "license": "MIT"', () => {
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
			expect(pkg.license).toBe('MIT');
		});

		it('retains "private": true to prevent accidental publishing to public registries', () => {
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
			expect(pkg.private).toBe(true);
		});

		it('includes a descriptive summary', () => {
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
			expect(typeof pkg.description).toBe('string');
			expect(pkg.description.trim().length).toBeGreaterThan(10);
		});

		it('includes relevant keywords', () => {
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
			expect(Array.isArray(pkg.keywords)).toBe(true);
			expect(pkg.keywords).toContain('typing-test');
			expect(pkg.keywords).toContain('wpm');
			expect(pkg.keywords).toContain('speed-typing');
			expect(pkg.keywords).toContain('svelte');
			expect(pkg.keywords).toContain('tauri');
			expect(pkg.keywords).toContain('offline-first');
			expect(pkg.keywords).toContain('self-hosted');
			expect(pkg.keywords).toContain('sqlite');
		});

		it('specifies the repository URL as https://github.com/Trindade7/stype.git', () => {
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
			expect(pkg.repository).toBeDefined();
			expect(pkg.repository.type).toBe('git');
			expect(pkg.repository.url).toBe('https://github.com/Trindade7/stype.git');
		});
	});
});
