import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Tauri 2 packaging and configuration smoke tests', () => {
	const rootDir = resolve(process.cwd());
	const tauriDir = resolve(rootDir, 'src-tauri');

	it('contains valid tauri.conf.json configured for static SPA distribution', () => {
		const confPath = resolve(tauriDir, 'tauri.conf.json');
		expect(existsSync(confPath)).toBe(true);

		const config = JSON.parse(readFileSync(confPath, 'utf-8'));
		expect(config.productName).toBe('Stype');
		expect(config.identifier).toBe('com.stype.client');
		expect(config.build.frontendDist).toBe('../build');
		expect(config.build.beforeBuildCommand).toBe('pnpm build:static');
		expect(config.app.windows).toHaveLength(1);
		expect(config.app.windows[0].title).toBe('Stype');
	});

	it('includes mobile configuration for Android and iOS in tauri.conf.json', () => {
		const confPath = resolve(tauriDir, 'tauri.conf.json');
		const config = JSON.parse(readFileSync(confPath, 'utf-8'));

		expect(config.bundle.android).toBeDefined();
		expect(config.bundle.android.minSdkVersion).toBeGreaterThanOrEqual(24);
		expect(config.bundle.iOS).toBeDefined();
		expect(config.bundle.iOS.minimumSystemVersion).toBeDefined();
	});

	it('configures Cargo.toml with sqlite plugin and mobile crate types', () => {
		const cargoPath = resolve(tauriDir, 'Cargo.toml');
		expect(existsSync(cargoPath)).toBe(true);

		const cargoContent = readFileSync(cargoPath, 'utf-8');
		expect(cargoContent).toContain('crate-type = ["staticlib", "cdylib", "rlib"]');
		expect(cargoContent).toContain('tauri-plugin-sql');
		expect(cargoContent).toContain('"sqlite"');
	});

	it('declares necessary core and sql execute permissions in capabilities', () => {
		const capPath = resolve(tauriDir, 'capabilities/default.json');
		expect(existsSync(capPath)).toBe(true);

		const cap = JSON.parse(readFileSync(capPath, 'utf-8'));
		expect(cap.permissions).toContain('core:default');
		expect(cap.permissions).toContain('sql:default');
		expect(cap.permissions).toContain('sql:allow-execute');
	});

	it('provides all standard desktop and mobile icons', () => {
		const icons = [
			'32x32.png',
			'128x128.png',
			'128x128@2x.png',
			'icon.icns',
			'icon.ico'
		];

		for (const icon of icons) {
			const iconPath = resolve(tauriDir, 'icons', icon);
			expect(existsSync(iconPath)).toBe(true);
		}
	});

	it('verifies static build artifacts exist with index.html SPA entrypoint', () => {
		const buildDir = resolve(rootDir, 'build');
		const indexHtml = resolve(buildDir, 'index.html');
		expect(existsSync(indexHtml)).toBe(true);

		const htmlContent = readFileSync(indexHtml, 'utf-8');
		expect(htmlContent).toContain('<!doctype html>');
	});
});
