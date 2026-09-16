import { describe, it, expect, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createContext, runInContext } from 'node:vm';

describe('PocketBase Schema Migrations and Containerized SPA Server', () => {
	const projectRoot = resolve(__dirname, '..');
	const migrationsDir = join(projectRoot, 'pb_migrations');

	describe('PocketBase Migration Files', () => {
		it('migrations directory exists at project root', () => {
			expect(existsSync(migrationsDir)).toBe(true);
		});

		it('contains at least one JavaScript migration file', () => {
			const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.js'));
			expect(files.length).toBeGreaterThan(0);
		});

		it('defines collections for settings, custom passages, and test runs', () => {
			const files = readdirSync(migrationsDir)
				.filter((f) => f.endsWith('.js'))
				.sort();

			let upFn: ((app: any) => void) | null = null;
			let downFn: ((app: any) => void) | null = null;

			const mockContext = {
				migrate: vi.fn((up, down) => {
					upFn = up;
					downFn = down;
				}),
				Collection: class MockCollection {
					constructor(config: Record<string, any>) {
						Object.assign(this, config);
					}
				},
				console
			};

			const migrationContent = readFileSync(join(migrationsDir, files[0]), 'utf-8');
			const vmContext = createContext(mockContext);
			runInContext(migrationContent, vmContext);

			expect(mockContext.migrate).toHaveBeenCalled();
			expect(typeof upFn).toBe('function');

			const savedCollections: Record<string, any> = {};
			const mockApp = {
				save: vi.fn((col: any) => {
					savedCollections[col.name] = col;
				}),
				findCollectionByNameOrId: vi.fn((name: string) => savedCollections[name] || null),
				delete: vi.fn((col: any) => {
					delete savedCollections[col.name];
				})
			};

			upFn!(mockApp);

			expect(savedCollections).toHaveProperty('settings');
			expect(savedCollections).toHaveProperty('custom_passages');
			expect(savedCollections).toHaveProperty('test_runs');
		});

		it('configures required fields for settings collection', () => {
			const files = readdirSync(migrationsDir)
				.filter((f) => f.endsWith('.js'))
				.sort();

			let upFn: ((app: any) => void) | null = null;
			const mockContext = {
				migrate: vi.fn((up) => {
					upFn = up;
				}),
				Collection: class MockCollection {
					constructor(config: Record<string, any>) {
						Object.assign(this, config);
					}
				}
			};

			runInContext(readFileSync(join(migrationsDir, files[0]), 'utf-8'), createContext(mockContext));

			const savedCollections: Record<string, any> = {};
			const mockApp = {
				save: vi.fn((col: any) => {
					savedCollections[col.name] = col;
				})
			};

			upFn!(mockApp);

			const settings = savedCollections['settings'];
			expect(settings).toBeDefined();

			const fields = settings.fields || settings.schema || [];
			const fieldNames = fields.map((f: any) => f.name);

			expect(fieldNames).toContain('user');
			expect(fieldNames).toContain('mode');
			expect(fieldNames).toContain('duration');
			expect(fieldNames).toContain('passage_length');
			expect(fieldNames).toContain('zen_mode');
			expect(fieldNames).toContain('theme');
			expect(fieldNames).toContain('scroll_mode');

			const userField = fields.find((f: any) => f.name === 'user');
			expect(userField.type).toBe('relation');
			expect(userField.required).toBe(true);
			expect(Array.isArray(settings.schema)).toBe(true);
			expect(userField.options?.collectionId).toBe('_pb_users_auth_');
			expect(userField.options?.cascadeDelete).toBe(true);
		});

		it('configures required fields for custom passages collection', () => {
			const files = readdirSync(migrationsDir)
				.filter((f) => f.endsWith('.js'))
				.sort();

			let upFn: ((app: any) => void) | null = null;
			const mockContext = {
				migrate: vi.fn((up) => {
					upFn = up;
				}),
				Collection: class MockCollection {
					constructor(config: Record<string, any>) {
						Object.assign(this, config);
					}
				}
			};

			runInContext(readFileSync(join(migrationsDir, files[0]), 'utf-8'), createContext(mockContext));

			const savedCollections: Record<string, any> = {};
			const mockApp = {
				save: vi.fn((col: any) => {
					savedCollections[col.name] = col;
				})
			};

			upFn!(mockApp);

			const passages = savedCollections['custom_passages'];
			expect(passages).toBeDefined();

			const fields = passages.fields || passages.schema || [];
			const fieldNames = fields.map((f: any) => f.name);

			expect(fieldNames).toContain('user');
			expect(fieldNames).toContain('text');
			expect(fieldNames).toContain('source');
			expect(fieldNames).toContain('deleted_at');

			const textField = fields.find((f: any) => f.name === 'text');
			expect(textField.required).toBe(true);
			expect(Array.isArray(passages.schema)).toBe(true);
			const passageUserField = fields.find((f: any) => f.name === 'user');
			expect(passageUserField.options?.collectionId).toBe('_pb_users_auth_');
			expect(passageUserField.options?.cascadeDelete).toBe(true);
		});

		it('configures required fields and index for test runs collection', () => {
			const files = readdirSync(migrationsDir)
				.filter((f) => f.endsWith('.js'))
				.sort();

			let upFn: ((app: any) => void) | null = null;
			const mockContext = {
				migrate: vi.fn((up) => {
					upFn = up;
				}),
				Collection: class MockCollection {
					constructor(config: Record<string, any>) {
						Object.assign(this, config);
					}
				}
			};

			runInContext(readFileSync(join(migrationsDir, files[0]), 'utf-8'), createContext(mockContext));

			const savedCollections: Record<string, any> = {};
			const mockApp = {
				save: vi.fn((col: any) => {
					savedCollections[col.name] = col;
				})
			};

			upFn!(mockApp);

			const testRuns = savedCollections['test_runs'];
			expect(testRuns).toBeDefined();

			const fields = testRuns.fields || testRuns.schema || [];
			const fieldNames = fields.map((f: any) => f.name);

			expect(fieldNames).toContain('user');
			expect(fieldNames).toContain('client_id');
			expect(fieldNames).toContain('passage_id');
			expect(fieldNames).toContain('mode');
			expect(fieldNames).toContain('wpm');
			expect(fieldNames).toContain('accuracy');
			expect(fieldNames).toContain('time_elapsed');
			expect(fieldNames).toContain('correct_chars');
			expect(fieldNames).toContain('incorrect_chars');
			expect(fieldNames).toContain('extra_chars');
			expect(fieldNames).toContain('missed_chars');
			expect(fieldNames).toContain('timeline_snapshots');

			const userField = fields.find((f: any) => f.name === 'user');
			expect(userField.type).toBe('relation');
			expect(userField.required).toBe(true);
			expect(Array.isArray(testRuns.schema)).toBe(true);
			expect(userField.options?.collectionId).toBe('_pb_users_auth_');
			expect(userField.options?.cascadeDelete).toBe(true);

			const indexes = testRuns.indexes || [];
			const hasClientIdIndex = indexes.some((idx: string) => idx.includes('client_id'));
			expect(hasClientIdIndex).toBe(true);
		});

		it('enforces access rules on all collections so users only access their own records', () => {
			const files = readdirSync(migrationsDir)
				.filter((f) => f.endsWith('.js'))
				.sort();

			let upFn: ((app: any) => void) | null = null;
			const mockContext = {
				migrate: vi.fn((up) => {
					upFn = up;
				}),
				Collection: class MockCollection {
					constructor(config: Record<string, any>) {
						Object.assign(this, config);
					}
				}
			};

			runInContext(readFileSync(join(migrationsDir, files[0]), 'utf-8'), createContext(mockContext));

			const savedCollections: Record<string, any> = {};
			const mockApp = {
				save: vi.fn((col: any) => {
					savedCollections[col.name] = col;
				})
			};

			upFn!(mockApp);

			for (const name of ['settings', 'custom_passages', 'test_runs']) {
				const col = savedCollections[name];
				expect(col).toBeDefined();

				expect(col.listRule).toMatch(/user\s*=\s*@request\.auth\.id/);
				expect(col.viewRule).toMatch(/user\s*=\s*@request\.auth\.id/);
				expect(col.createRule).toMatch(/user\s*=\s*@request\.auth\.id/);
				expect(col.updateRule).toMatch(/user\s*=\s*@request\.auth\.id/);
				expect(col.deleteRule).toMatch(/user\s*=\s*@request\.auth\.id/);

				expect(col.listRule).toContain('@request.auth.id');
			}
		});

		it('reverts all collections in the down migration', () => {
			const files = readdirSync(migrationsDir)
				.filter((f) => f.endsWith('.js'))
				.sort();

			let upFn: ((app: any) => void) | null = null;
			let downFn: ((app: any) => void) | null = null;
			const mockContext = {
				migrate: vi.fn((up, down) => {
					upFn = up;
					downFn = down;
				}),
				Collection: class MockCollection {
					constructor(config: Record<string, any>) {
						Object.assign(this, config);
					}
				}
			};

			runInContext(readFileSync(join(migrationsDir, files[0]), 'utf-8'), createContext(mockContext));

			const savedCollections: Record<string, any> = {};
			const mockApp = {
				save: vi.fn((col: any) => {
					savedCollections[col.name] = col;
				}),
				findCollectionByNameOrId: vi.fn((name: string) => savedCollections[name] || null),
				delete: vi.fn((col: any) => {
					delete savedCollections[col.name];
				})
			};

			upFn!(mockApp);
			expect(Object.keys(savedCollections).length).toBe(3);

			downFn!(mockApp);
			expect(Object.keys(savedCollections).length).toBe(0);
		});
	});

	describe('PocketBase Dockerfile', () => {
		const dockerfilePath = join(projectRoot, 'Dockerfile.pocketbase');

		it('exists at the project root', () => {
			expect(existsSync(dockerfilePath)).toBe(true);
		});

		it('implements a multi-stage build that compiles static SPA assets', () => {
			const content = readFileSync(dockerfilePath, 'utf-8');
			expect(content).toContain('AS builder');
			expect(content).toMatch(/pnpm build:static|STATIC_BUILD=1/);
		});

		it('downloads and installs the PocketBase binary', () => {
			const content = readFileSync(dockerfilePath, 'utf-8');
			expect(content).toMatch(/pocketbase/i);
			expect(content).toMatch(/github\.com\/pocketbase\/pocketbase\/releases/);
		});

		it('copies static SPA output to public directory and bundles migrations', () => {
			const content = readFileSync(dockerfilePath, 'utf-8');
			expect(content).toMatch(/pb_public/);
			expect(content).toMatch(/pb_migrations/);
		});

		it('exposes port 8090 and defines persistent volume for pb_data', () => {
			const content = readFileSync(dockerfilePath, 'utf-8');
			expect(content).toContain('EXPOSE 8090');
			expect(content).toMatch(/pb_data/);
		});

		it('starts pocketbase server serving publicDir and http port 8090', () => {
			const content = readFileSync(dockerfilePath, 'utf-8');
			expect(content).toMatch(/serve/);
			expect(content).toMatch(/8090/);
		});
	});

	describe('PocketBase Docker Compose', () => {
		const composePath = join(projectRoot, 'docker-compose.pocketbase.yml');

		it('exists at the project root', () => {
			expect(existsSync(composePath)).toBe(true);
		});

		it('configures service building from Dockerfile.pocketbase', () => {
			const content = readFileSync(composePath, 'utf-8');
			expect(content).toContain('services:');
			expect(content).toContain('Dockerfile.pocketbase');
		});

		it('maps port 8090 to host', () => {
			const content = readFileSync(composePath, 'utf-8');
			expect(content).toMatch(/- "\$\{PORT:-8090\}:8090"/);
		});

		it('mounts persistent volume for pb_data storage', () => {
			const content = readFileSync(composePath, 'utf-8');
			expect(content).toMatch(/pb_data/);
		});
	});

	describe('Local Runner and Data Directory', () => {
		it('defines pocketbase command in package.json', () => {
			const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
			expect(pkg.scripts).toHaveProperty('pocketbase');
			expect(pkg.scripts.pocketbase).toMatch(/pocketbase serve/);
			expect(pkg.scripts.pocketbase).toMatch(/8090/);
		});

		it('tracks pb_data/.gitkeep so data directory exists on fresh checkout', () => {
			expect(existsSync(join(projectRoot, 'pb_data', '.gitkeep'))).toBe(true);
		});
	});
});
