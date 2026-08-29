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
});
