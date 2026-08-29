import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as schema from './schema';
import { seedAdminUser, seedPassages } from './seed';

const DEFAULT_DB_PATH = process.env.DATABASE_URL || 'data/stype.db';

export function initializeDatabase(dbPath: string = DEFAULT_DB_PATH): {
	sqlite: InstanceType<typeof Database>;
	db: BetterSQLite3Database<typeof schema>;
} {
	if (dbPath !== ':memory:') {
		const dir = path.dirname(dbPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	}

	const sqlite = new Database(dbPath);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');

	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			email TEXT UNIQUE,
			name TEXT,
			role TEXT NOT NULL DEFAULT 'user',
			email_confirmed INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			expires_at INTEGER NOT NULL,
			created_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS passages (
			id TEXT PRIMARY KEY,
			text TEXT NOT NULL,
			source TEXT,
			user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			deleted_at INTEGER
		);
		CREATE TABLE IF NOT EXISTS test_runs (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			passage_id TEXT NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
			mode TEXT NOT NULL DEFAULT 'passage',
			duration INTEGER,
			wpm INTEGER NOT NULL,
			accuracy INTEGER NOT NULL,
			time_elapsed INTEGER NOT NULL,
			correct_chars INTEGER NOT NULL,
			incorrect_chars INTEGER NOT NULL,
			extra_chars INTEGER NOT NULL,
			missed_chars INTEGER NOT NULL,
			timeline_snapshots TEXT,
			created_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS user_settings (
			user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			mode TEXT NOT NULL DEFAULT 'passage',
			duration INTEGER NOT NULL DEFAULT 30,
			passage_length TEXT NOT NULL DEFAULT 'all',
			zen_mode INTEGER NOT NULL DEFAULT 0,
			theme TEXT NOT NULL DEFAULT 'system',
			scroll_mode TEXT NOT NULL DEFAULT 'center',
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			deleted_at INTEGER
		);
		CREATE TABLE IF NOT EXISTS password_reset_tokens (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			token_hash TEXT UNIQUE NOT NULL,
			expires_at INTEGER NOT NULL,
			created_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS email_confirmation_tokens (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			token_hash TEXT UNIQUE NOT NULL,
			expires_at INTEGER NOT NULL,
			created_at INTEGER NOT NULL
		);
	`);

	// Ensure user_id column exists for pre-existing passages table
	try {
		sqlite.exec('ALTER TABLE passages ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE');
	} catch {
		// Column already exists or table was just created
	}

	try {
		sqlite.exec('ALTER TABLE users ADD COLUMN email TEXT');
	} catch {
		// Column already exists or table was just created
	}

	try {
		sqlite.exec('ALTER TABLE users ADD COLUMN name TEXT');
	} catch {
		// Column already exists or table was just created
	}

	try {
		sqlite.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
	} catch {
		// Column already exists or table was just created
	}

	try {
		sqlite.exec('ALTER TABLE users ADD COLUMN email_confirmed INTEGER NOT NULL DEFAULT 0');
	} catch {
		// Column already exists or table was just created
	}

	try {
		sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email)');
	} catch {
		// Index already exists
	}

	try {
		sqlite.exec('ALTER TABLE test_runs ADD COLUMN mode TEXT NOT NULL DEFAULT \'passage\'');
	} catch {}

	try {
		sqlite.exec('ALTER TABLE test_runs ADD COLUMN duration INTEGER');
	} catch {}

	// Ensure timeline_snapshots column exists for pre-existing tables
	try {
		sqlite.exec('ALTER TABLE test_runs ADD COLUMN timeline_snapshots TEXT');
	} catch {
		// Column already exists or table was just created
	}

	try {
		sqlite.exec("ALTER TABLE user_settings ADD COLUMN scroll_mode TEXT NOT NULL DEFAULT 'center'");
	} catch {
		// Column already exists or table was just created
	}

	try {
		sqlite.exec('ALTER TABLE passages ADD COLUMN updated_at INTEGER');
		sqlite.exec('UPDATE passages SET updated_at = created_at WHERE updated_at IS NULL');
	} catch {}

	try {
		sqlite.exec('ALTER TABLE passages ADD COLUMN deleted_at INTEGER');
	} catch {}

	try {
		sqlite.exec('ALTER TABLE user_settings ADD COLUMN deleted_at INTEGER');
	} catch {}

	// Migrate passages and test_runs from integer IDs to UUID strings if needed
	const passagesInfo = sqlite.pragma('table_info(passages)') as { name: string; type: string }[];
	const testRunsInfo = sqlite.pragma('table_info(test_runs)') as { name: string; type: string }[];

	const isPassagesInteger = passagesInfo.some((col) => col.name === 'id' && col.type.toUpperCase().includes('INT'));
	const isTestRunsInteger = testRunsInfo.some((col) => col.name === 'id' && col.type.toUpperCase().includes('INT'));

	if (isPassagesInteger || isTestRunsInteger) {
		sqlite.pragma('foreign_keys = OFF');
		const migrateTx = sqlite.transaction(() => {
			const passageIdMap = new Map<number | string, string>();

			if (isPassagesInteger) {
				const oldPassages = sqlite.prepare('SELECT * FROM passages').all() as any[];
				for (const p of oldPassages) {
					passageIdMap.set(p.id, crypto.randomUUID());
				}

				sqlite.exec(`
					CREATE TABLE passages_new (
						id TEXT PRIMARY KEY,
						text TEXT NOT NULL,
						source TEXT,
						user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
						created_at INTEGER NOT NULL,
						updated_at INTEGER NOT NULL,
						deleted_at INTEGER
					);
				`);

				const insertPassage = sqlite.prepare(`
					INSERT INTO passages_new (id, text, source, user_id, created_at, updated_at, deleted_at)
					VALUES (?, ?, ?, ?, ?, ?, ?)
				`);

				for (const p of oldPassages) {
					const newId = passageIdMap.get(p.id)!;
					const createdAt = p.created_at;
					const updatedAt = p.updated_at ?? createdAt;
					const deletedAt = p.deleted_at ?? null;
					insertPassage.run(newId, p.text, p.source, p.user_id, createdAt, updatedAt, deletedAt);
				}

				sqlite.exec('DROP TABLE passages;');
				sqlite.exec('ALTER TABLE passages_new RENAME TO passages;');
			}

			if (isTestRunsInteger || isPassagesInteger) {
				const oldRuns = sqlite.prepare('SELECT * FROM test_runs').all() as any[];

				sqlite.exec(`
					CREATE TABLE test_runs_new (
						id TEXT PRIMARY KEY,
						user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
						passage_id TEXT NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
						mode TEXT NOT NULL DEFAULT 'passage',
						duration INTEGER,
						wpm INTEGER NOT NULL,
						accuracy INTEGER NOT NULL,
						time_elapsed INTEGER NOT NULL,
						correct_chars INTEGER NOT NULL,
						incorrect_chars INTEGER NOT NULL,
						extra_chars INTEGER NOT NULL,
						missed_chars INTEGER NOT NULL,
						timeline_snapshots TEXT,
						created_at INTEGER NOT NULL
					);
				`);

				const insertRun = sqlite.prepare(`
					INSERT INTO test_runs_new (
						id, user_id, passage_id, mode, duration, wpm, accuracy,
						time_elapsed, correct_chars, incorrect_chars, extra_chars, missed_chars,
						timeline_snapshots, created_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`);

				for (const r of oldRuns) {
					const runId = isTestRunsInteger ? crypto.randomUUID() : String(r.id);
					const newPassageId = passageIdMap.get(r.passage_id) ?? String(r.passage_id);
					insertRun.run(
						runId,
						r.user_id,
						newPassageId,
						r.mode ?? 'passage',
						r.duration ?? null,
						r.wpm,
						r.accuracy,
						r.time_elapsed,
						r.correct_chars,
						r.incorrect_chars,
						r.extra_chars,
						r.missed_chars,
						r.timeline_snapshots ?? null,
						r.created_at
					);
				}

				sqlite.exec('DROP TABLE test_runs;');
				sqlite.exec('ALTER TABLE test_runs_new RENAME TO test_runs;');
			}
		});

		migrateTx();
		sqlite.pragma('foreign_keys = ON');
	}

	try {
		sqlite.exec(`
			CREATE TABLE IF NOT EXISTS password_reset_tokens (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				token_hash TEXT UNIQUE NOT NULL,
				expires_at INTEGER NOT NULL,
				created_at INTEGER NOT NULL
			);
		`);
	} catch {
		// Table already exists
	}

	try {
		sqlite.exec(`
			CREATE TABLE IF NOT EXISTS email_confirmation_tokens (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				token_hash TEXT UNIQUE NOT NULL,
				expires_at INTEGER NOT NULL,
				created_at INTEGER NOT NULL
			);
		`);
	} catch {
		// Table already exists
	}

	const db = drizzle(sqlite, { schema });
	return { sqlite, db };
}

let defaultDb: BetterSQLite3Database<typeof schema> | null = null;

export function getDb(): BetterSQLite3Database<typeof schema> {
	if (!defaultDb) {
		const { db } = initializeDatabase();
		defaultDb = db;
		seedAdminUser(defaultDb).catch((err) => {
			console.error('Failed to seed admin user:', err);
		});
		seedPassages(defaultDb).catch((err) => {
			console.error('Failed to seed passages:', err);
		});
	}
	return defaultDb;
}

export const db = getDb();
