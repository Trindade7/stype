import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

describe('Production Containerization and Environment Template', () => {
	const projectRoot = resolve(__dirname, '..');

	describe('.env.example configuration template', () => {
		const envPath = join(projectRoot, '.env.example');

		it('exists at the project root', () => {
			expect(existsSync(envPath)).toBe(true);
		});

		it('contains explanations and documentation comments', () => {
			const content = readFileSync(envPath, 'utf-8');
			expect(content).toContain('# Stype Server Configuration Template');
			expect(content).toContain('# Server network binding');
			expect(content).toContain('# Public URL of the instance');
			expect(content).toContain('# SQLite database file location');
			expect(content).toContain('# Initial Administrator Account');
			expect(content).toContain('# SMTP Email Delivery');
		});

		it('defines all recognized server and database configuration variables', () => {
			const content = readFileSync(envPath, 'utf-8');
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
				const regex = new RegExp(`^${v}=`, 'm');
				expect(content).toMatch(regex);
			}
		});

		it('provides safe default values for local deployment', () => {
			const content = readFileSync(envPath, 'utf-8');
			expect(content).toMatch(/^PORT=3000$/m);
			expect(content).toMatch(/^HOST=0\.0\.0\.0$/m);
			expect(content).toMatch(/^ORIGIN=http:\/\/localhost:3000$/m);
			expect(content).toMatch(/^DATABASE_URL=data\/stype\.db$/m);
			expect(content).toMatch(/^INITIAL_ADMIN_PASSWORD=admin123$/m);
			expect(content).toMatch(/^INITIAL_ADMIN_EMAIL=admin@stype\.local$/m);
		});
	});

	describe('Dockerfile', () => {
		const dockerfilePath = join(projectRoot, 'Dockerfile');

		it('exists at the project root', () => {
			expect(existsSync(dockerfilePath)).toBe(true);
		});

		it('implements a multi-stage build with builder and runner stages', () => {
			const content = readFileSync(dockerfilePath, 'utf-8');
			expect(content).toContain('AS builder');
			expect(content).toContain('AS runner');
		});

		it('uses Node.js 22 slim base images', () => {
			const content = readFileSync(dockerfilePath, 'utf-8');
			expect(content).toMatch(/FROM node:22-bookworm-slim AS builder/);
			expect(content).toMatch(/FROM node:22-bookworm-slim AS runner/);
		});

		it('builds application assets using pnpm build in the builder stage', () => {
			const content = readFileSync(dockerfilePath, 'utf-8');
			expect(content).toContain('pnpm build');
			expect(content).toContain('COPY --from=builder /app/build ./build');
		});

		it('drops privileges to unprivileged node user for security', () => {
			const content = readFileSync(dockerfilePath, 'utf-8');
			expect(content).toContain('USER node');
			// Ownership of /app must be granted to node user
			expect(content).toContain('chown -R node:node /app');
		});

		it('exposes port 3000 and configures persistent database storage under /app/data', () => {
			const content = readFileSync(dockerfilePath, 'utf-8');
			expect(content).toContain('EXPOSE 3000');
			expect(content).toContain('mkdir -p /app/data');
			expect(content).toContain('VOLUME ["/app/data"]');
			expect(content).toContain('ENV DATABASE_URL=/app/data/stype.db');
		});

		it('specifies the production startup entrypoint', () => {
			const content = readFileSync(dockerfilePath, 'utf-8');
			expect(content).toContain('CMD ["node", "build/index.js"]');
		});
	});

	describe('docker-compose.yml', () => {
		const composePath = join(projectRoot, 'docker-compose.yml');

		it('exists at the project root', () => {
			expect(existsSync(composePath)).toBe(true);
		});

		it('defines the stype service building from local Dockerfile', () => {
			const content = readFileSync(composePath, 'utf-8');
			expect(content).toContain('services:');
			expect(content).toContain('stype:');
			expect(content).toContain('dockerfile: Dockerfile');
		});

		it('configures host port mapping to container port 3000', () => {
			const content = readFileSync(composePath, 'utf-8');
			expect(content).toMatch(/- "\$\{PORT:-3000\}:3000"/);
		});

		it('mounts persistent host directory ./data to container /app/data', () => {
			const content = readFileSync(composePath, 'utf-8');
			expect(content).toContain('- ./data:/app/data');
		});

		it('passes through environment variables matching configuration template', () => {
			const content = readFileSync(composePath, 'utf-8');
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
				expect(content).toContain(v);
			}
		});

		it('configures restart policy for container resilience', () => {
			const content = readFileSync(composePath, 'utf-8');
			expect(content).toContain('restart: unless-stopped');
		});
	});
});
