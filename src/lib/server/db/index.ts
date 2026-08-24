import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
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
			created_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			expires_at INTEGER NOT NULL,
			created_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS passages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			text TEXT NOT NULL,
			source TEXT,
			created_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS test_runs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			passage_id INTEGER NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
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

	// Ensure timeline_snapshots column exists for pre-existing tables
	try {
		sqlite.exec('ALTER TABLE test_runs ADD COLUMN timeline_snapshots TEXT');
	} catch {
		// Column already exists or table was just created
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
