import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import http from 'node:http';

describe('Build Verification Pipeline', () => {
	const projectRoot = resolve(__dirname, '..');
	const buildDir = join(projectRoot, 'build');

	describe('Static SPA Build (STATIC_BUILD=1)', () => {
		let staticOutput: string;
		let server: http.Server;
		let serverPort: number;

		beforeAll(async () => {
			// Run static build
			staticOutput = execSync('npx vite build', {
				cwd: projectRoot,
				env: {
					...process.env,
					STATIC_BUILD: '1'
				},
				encoding: 'utf-8'
			});

			// Start a static file server with SPA fallback to test static asset serving
			const mimeTypes: Record<string, string> = {
				'.html': 'text/html',
				'.js': 'application/javascript',
				'.css': 'text/css',
				'.json': 'application/json',
				'.woff2': 'font/woff2',
				'.svg': 'image/svg+xml'
			};

			server = http.createServer((req, res) => {
				const url = new URL(req.url ?? '/', `http://localhost:${serverPort}`);
				const cleanPath = url.pathname;
				const filePath = join(buildDir, cleanPath);

				if (existsSync(filePath) && !cleanPath.endsWith('/')) {
					const ext = cleanPath.slice(cleanPath.lastIndexOf('.'));
					const contentType = mimeTypes[ext] ?? 'application/octet-stream';
					res.writeHead(200, { 'Content-Type': contentType });
					res.end(readFileSync(filePath));
				} else {
					// SPA fallback
					const fallbackPath = join(buildDir, 'index.html');
					res.writeHead(200, { 'Content-Type': 'text/html' });
					res.end(readFileSync(fallbackPath));
				}
			});

			await new Promise<void>((resolvePromise) => {
				server.listen(0, '127.0.0.1', () => {
					const address = server.address();
					if (address && typeof address === 'object') {
						serverPort = address.port;
					}
					resolvePromise();
				});
			});
		}, 60000);

		afterAll(async () => {
			if (server) {
				await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
			}
		});

		it('builds using @sveltejs/adapter-static without throwing errors on server routes', () => {
			expect(staticOutput).toContain('@sveltejs/adapter-static');
			expect(staticOutput).toContain('Wrote site to "build"');
			expect(existsSync(join(buildDir, 'index.html'))).toBe(true);
		});

		it('produces a clean standalone static asset directory with fallback index.html', () => {
			const indexHtml = readFileSync(join(buildDir, 'index.html'), 'utf-8');
			expect(indexHtml).toContain('<!doctype html>');
			expect(indexHtml).toContain('__sveltekit');

			const appDir = join(buildDir, '_app');
			expect(existsSync(appDir)).toBe(true);
			const immutableDir = join(appDir, 'immutable');
			expect(existsSync(immutableDir)).toBe(true);
		});

		it('serves typing tests view (/) via static fallback without a backend', async () => {
			const res = await fetch(`http://127.0.0.1:${serverPort}/`);
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('text/html');
			const html = await res.text();
			expect(html).toContain('<!doctype html>');
		});

		it('serves history view (/history) via static fallback without a backend', async () => {
			const res = await fetch(`http://127.0.0.1:${serverPort}/history`);
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('text/html');
			const html = await res.text();
			expect(html).toContain('<!doctype html>');
		});

		it('serves stats view (/stats) via static fallback without a backend', async () => {
			const res = await fetch(`http://127.0.0.1:${serverPort}/stats`);
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('text/html');
			const html = await res.text();
			expect(html).toContain('<!doctype html>');
		});

		it('serves passages view (/passages) via static fallback without a backend', async () => {
			const res = await fetch(`http://127.0.0.1:${serverPort}/passages`);
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('text/html');
			const html = await res.text();
			expect(html).toContain('<!doctype html>');
		});

		it('serves settings view (/settings) via static fallback without a backend', async () => {
			const res = await fetch(`http://127.0.0.1:${serverPort}/settings`);
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('text/html');
			const html = await res.text();
			expect(html).toContain('<!doctype html>');
		});

		it('serves immutable client assets successfully', async () => {
			const immutableDir = join(buildDir, '_app', 'immutable');
			const entries = readdirSync(immutableDir, { recursive: true, withFileTypes: true });
			const jsFile = entries.find((e) => e.isFile() && e.name.endsWith('.js'));
			expect(jsFile).toBeDefined();

			if (jsFile) {
				const relativePath = join(
					jsFile.parentPath.replace(buildDir, ''),
					jsFile.name
				).replace(/\\/g, '/');
				const res = await fetch(`http://127.0.0.1:${serverPort}${relativePath}`);
				expect(res.status).toBe(200);
				expect(res.headers.get('content-type')).toContain('application/javascript');
			}
		});

		it('does not register server_loads on the root layout node in the static client bundle', () => {
			const entryDir = join(buildDir, '_app', 'immutable', 'entry');
			const appFile = readdirSync(entryDir).find((f) => f.startsWith('app.') && f.endsWith('.js'));
			expect(appFile).toBeDefined();

			const content = readFileSync(join(entryDir, appFile!), 'utf-8');
			// In SvelteKit, server_loads lists node indices that execute server load functions.
			// Node 0 is the root layout (+layout). If node 0 is in server_loads, the static SPA
			// will request /__data.json on initial load, causing a 404 HTML fallback and SyntaxError white screen.
			const match = content.match(/,\s*([A-Za-z0-9_$]+)\s*=\s*\[([0-9,\s]*)\][\s\S]*\b\1\s+as\s+server_loads\b/);
			expect(match).not.toBeNull();
			const loadedNodes = match![2].split(',').map((s) => s.trim()).filter(Boolean);
			expect(loadedNodes).not.toContain('0');
		});
	});

	describe('Default Node Server Build (STATIC_BUILD unset)', () => {
		let nodeOutput: string;

		beforeAll(() => {
			const env = { ...process.env };
			delete env.STATIC_BUILD;

			nodeOutput = execSync('npx vite build', {
				cwd: projectRoot,
				env,
				encoding: 'utf-8'
			});
		}, 60000);

		it('builds using @sveltejs/adapter-node for self-hosted server deployments', () => {
			expect(nodeOutput).toContain('@sveltejs/adapter-node');
		});

		it('produces standalone Node server files', () => {
			expect(existsSync(join(buildDir, 'index.js'))).toBe(true);
			expect(existsSync(join(buildDir, 'handler.js'))).toBe(true);
			expect(existsSync(join(buildDir, 'env.js'))).toBe(true);
		});
	});

	describe('Open Source Readiness and Deployment Artifacts', () => {
		it('includes an MIT LICENSE file with copyright holder', () => {
			const licensePath = join(projectRoot, 'LICENSE');
			expect(existsSync(licensePath)).toBe(true);
			const licenseContent = readFileSync(licensePath, 'utf-8');
			expect(licenseContent).toContain('MIT License');
			expect(licenseContent).toContain('Copyright (c) 2025 Trindade Jose');
		});

		it('configures open source package metadata in package.json', () => {
			const pkgPath = join(projectRoot, 'package.json');
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
			expect(pkg.license).toBe('MIT');
			expect(pkg.private).toBe(true);
			expect(pkg.description).toBeDefined();
			expect(pkg.repository).toBeDefined();
			expect(pkg.repository.url).toContain('Trindade7/stype');
		});

		it('provides an exhaustive .env.example configuration template', () => {
			const envPath = join(projectRoot, '.env.example');
			expect(existsSync(envPath)).toBe(true);
			const envContent = readFileSync(envPath, 'utf-8');
			const expectedVars = [
				'PORT',
				'HOST',
				'ORIGIN',
				'DATABASE_URL',
				'INITIAL_ADMIN_PASSWORD',
				'INITIAL_ADMIN_EMAIL',
				'SMTP_HOST',
				'SMTP_PORT',
				'SMTP_USER',
				'SMTP_PASS',
				'SMTP_FROM',
				'SMTP_SECURE'
			];
			for (const v of expectedVars) {
				expect(envContent).toContain(v);
			}
		});

		it('provides a multi-stage production Dockerfile and docker-compose.yml', () => {
			const dockerfilePath = join(projectRoot, 'Dockerfile');
			expect(existsSync(dockerfilePath)).toBe(true);
			const dockerfileContent = readFileSync(dockerfilePath, 'utf-8');
			expect(dockerfileContent).toContain('AS builder');
			expect(dockerfileContent).toContain('AS runner');
			expect(dockerfileContent).toContain('USER node');
			expect(dockerfileContent).toContain('EXPOSE 3000');
			expect(dockerfileContent).toContain('/app/data');

			const composePath = join(projectRoot, 'docker-compose.yml');
			expect(existsSync(composePath)).toBe(true);
			const composeContent = readFileSync(composePath, 'utf-8');
			expect(composeContent).toContain('services:');
			expect(composeContent).toContain('stype:');
			expect(composeContent).toContain('./data:/app/data');
		});

		it('provides complete documentation with valid cross-references', () => {
			const docFiles = [
				'README.md',
				'docs/deployment.md',
				'docs/installation.md',
				'docs/development.md'
			];

			for (const file of docFiles) {
				const filePath = join(projectRoot, file);
				expect(existsSync(filePath)).toBe(true);
				const content = readFileSync(filePath, 'utf-8');
				expect(content.length).toBeGreaterThan(100);

				// Verify local relative markdown links exist
				const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
				let match;
				while ((match = linkRegex.exec(content)) !== null) {
					const href = match[2];
					if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#') || href.startsWith('mailto:')) {
						continue;
					}
					const targetClean = href.split('#')[0];
					if (!targetClean) continue;
					const resolvedTarget = resolve(join(projectRoot, file, '..'), targetClean);
					expect(existsSync(resolvedTarget)).toBe(true);
				}
			}
		});
	});
});
