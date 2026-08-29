import type {
	GuestSettings,
	GuestPassage,
	GuestTestRun,
	GuestData,
	LocalStoreAdapter,
	SaveCustomPassageInput,
	SaveTestRunInput,
	SyncAccount
} from './types';
import { filterPassagesByLength, type PassageLength } from '../passage-utils';
import { DEFAULT_GUEST_SETTINGS, DEFAULT_PASSAGES } from './indexeddb';

export interface SqlQueryResult {
	rowsAffected: number;
	lastInsertId?: number;
}

export interface SqlClient {
	execute(query: string, bindValues?: unknown[]): Promise<SqlQueryResult>;
	select<T = unknown>(query: string, bindValues?: unknown[]): Promise<T>;
	close?(): Promise<boolean>;
}

export interface SqliteStoreAdapterOptions {
	dbPath?: string;
	client?: SqlClient;
}

export interface BetterSqliteDatabase {
	prepare: (sql: string) => {
		run: (...args: any[]) => { changes: number; lastInsertRowid: number | bigint };
		all: (...args: any[]) => any[];
	};
	close?: () => void;
}

export function createBetterSqliteClient(db: BetterSqliteDatabase): SqlClient {
	return {
		async execute(query: string, bindValues: unknown[] = []) {
			const stmt = db.prepare(query);
			const info = stmt.run(...bindValues);
			return {
				rowsAffected: info.changes,
				lastInsertId: Number(info.lastInsertRowid)
			};
		},
		async select<T = unknown>(query: string, bindValues: unknown[] = []): Promise<T> {
			const stmt = db.prepare(query);
			return stmt.all(...bindValues) as unknown as T;
		},
		async close() {
			db.close?.();
			return true;
		}
	};
}

let lastRunTimestamp = 0;
function getNextRunCreatedAt(specified?: string): string {
	if (specified) return specified;
	const now = Date.now();
	const timestamp = now <= lastRunTimestamp ? lastRunTimestamp + 1 : now;
	lastRunTimestamp = timestamp;
	return new Date(timestamp).toISOString();
}

let lastPassageTimestamp = 0;
function getNextPassageCreatedAt(specified?: string): string {
	if (specified) return specified;
	const now = Date.now();
	const timestamp = now <= lastPassageTimestamp ? lastPassageTimestamp + 1 : now;
	lastPassageTimestamp = timestamp;
	return new Date(timestamp).toISOString();
}

function generateUuid(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

export class SqliteStoreAdapter implements LocalStoreAdapter {
	private dbPath: string;
	private client: SqlClient | null = null;
	private initPromise: Promise<SqlClient> | null = null;

	constructor(options: SqliteStoreAdapterOptions = {}) {
		this.dbPath = options.dbPath ?? 'sqlite:stype.db';
		if (options.client) {
			this.client = options.client;
		}
	}

	private async getClient(): Promise<SqlClient> {
		if (this.client) {
			if (!this.initPromise) {
				this.initPromise = (async () => {
					await this.initSchema(this.client!);
					return this.client!;
				})();
			}
			return this.initPromise;
		}

		if (!this.initPromise) {
			this.initPromise = (async () => {
				const DatabaseModule = await import('@tauri-apps/plugin-sql');
				const Database = DatabaseModule.default || DatabaseModule;
				const db = await Database.load(this.dbPath);
				const clientWrapper: SqlClient = {
					execute: (query, binds) => db.execute(query, binds),
					select: (query, binds) => db.select(query, binds),
					close: () => db.close()
				};
				this.client = clientWrapper;
				await this.initSchema(clientWrapper);
				return clientWrapper;
			})();
		}
		return this.initPromise;
	}

	private async initSchema(client: SqlClient): Promise<void> {
		await client.execute(`
			CREATE TABLE IF NOT EXISTS guest_settings (
				id INTEGER PRIMARY KEY CHECK (id = 1),
				mode TEXT NOT NULL,
				duration INTEGER NOT NULL,
				passage_length TEXT NOT NULL,
				zen_mode INTEGER NOT NULL,
				theme TEXT NOT NULL,
				scroll_mode TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				deleted_at TEXT
			);
		`);

		await client.execute(`
			CREATE TABLE IF NOT EXISTS custom_passages (
				id TEXT PRIMARY KEY,
				text TEXT NOT NULL,
				source TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				deleted_at TEXT,
				is_custom INTEGER NOT NULL DEFAULT 1
			);
		`);

		await client.execute(`
			CREATE TABLE IF NOT EXISTS test_runs (
				id TEXT PRIMARY KEY,
				passage_id TEXT NOT NULL,
				mode TEXT NOT NULL,
				duration INTEGER,
				wpm REAL NOT NULL,
				accuracy REAL NOT NULL,
				time_elapsed REAL NOT NULL,
				correct_chars INTEGER NOT NULL,
				incorrect_chars INTEGER NOT NULL,
				extra_chars INTEGER NOT NULL,
				missed_chars INTEGER NOT NULL,
				timeline_snapshots TEXT NOT NULL,
				created_at TEXT NOT NULL,
				passage_text TEXT,
				passage_source TEXT
			);
		`);

		await client.execute(`
			CREATE TABLE IF NOT EXISTS sync_account (
				id INTEGER PRIMARY KEY CHECK (id = 1),
				server_url TEXT NOT NULL,
				token TEXT NOT NULL,
				user_json TEXT NOT NULL,
				last_synced_at TEXT
			);
		`);
	}

	async getSettings(): Promise<GuestSettings> {
		try {
			const client = await this.getClient();
			const rows = await client.select<
				Array<{
					id: number;
					mode: 'passage' | 'timed';
					duration: number;
					passage_length: 'all' | 'short' | 'medium' | 'long';
					zen_mode: number;
					theme: 'light' | 'dark' | 'system';
					scroll_mode: 'manual' | 'center' | 'step';
					updated_at: string;
					deleted_at: string | null;
				}>
			>('SELECT * FROM guest_settings WHERE id = 1 LIMIT 1');

			if (!rows || rows.length === 0) {
				return { ...DEFAULT_GUEST_SETTINGS };
			}

			const row = rows[0];
			return {
				mode: row.mode ?? DEFAULT_GUEST_SETTINGS.mode,
				duration: row.duration ?? DEFAULT_GUEST_SETTINGS.duration,
				passageLength: row.passage_length ?? DEFAULT_GUEST_SETTINGS.passageLength,
				zenMode: Boolean(row.zen_mode),
				theme: row.theme ?? DEFAULT_GUEST_SETTINGS.theme,
				scrollMode: row.scroll_mode ?? DEFAULT_GUEST_SETTINGS.scrollMode,
				updatedAt: row.updated_at ?? DEFAULT_GUEST_SETTINGS.updatedAt,
				deletedAt: row.deleted_at ?? DEFAULT_GUEST_SETTINGS.deletedAt ?? null
			};
		} catch {
			return { ...DEFAULT_GUEST_SETTINGS };
		}
	}

	async saveSettings(updates: Partial<GuestSettings>): Promise<GuestSettings> {
		const current = await this.getSettings();
		const now = new Date().toISOString();
		const merged: GuestSettings = {
			mode: updates.mode ?? current.mode,
			duration: updates.duration ?? current.duration,
			passageLength: updates.passageLength ?? current.passageLength,
			zenMode: updates.zenMode ?? current.zenMode,
			theme: updates.theme ?? current.theme,
			scrollMode: updates.scrollMode ?? current.scrollMode,
			updatedAt: updates.updatedAt ?? now,
			deletedAt: updates.deletedAt !== undefined ? updates.deletedAt : (current.deletedAt ?? null)
		};

		const client = await this.getClient();
		await client.execute(
			`INSERT INTO guest_settings (id, mode, duration, passage_length, zen_mode, theme, scroll_mode, updated_at, deleted_at)
			 VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET
				mode = excluded.mode,
				duration = excluded.duration,
				passage_length = excluded.passage_length,
				zen_mode = excluded.zen_mode,
				theme = excluded.theme,
				scroll_mode = excluded.scroll_mode,
				updated_at = excluded.updated_at,
				deleted_at = excluded.deleted_at`,
			[
				merged.mode,
				merged.duration,
				merged.passageLength,
				merged.zenMode ? 1 : 0,
				merged.theme,
				merged.scrollMode,
				merged.updatedAt,
				merged.deletedAt
			]
		);

		return merged;
	}

	async getCustomPassages(includeDeleted = false): Promise<GuestPassage[]> {
		try {
			const client = await this.getClient();
			const query = includeDeleted
				? 'SELECT * FROM custom_passages ORDER BY created_at ASC'
				: 'SELECT * FROM custom_passages WHERE deleted_at IS NULL ORDER BY created_at ASC';
			const rows = await client.select<
				Array<{
					id: string;
					text: string;
					source: string | null;
					created_at: string;
					updated_at: string;
					deleted_at: string | null;
					is_custom: number;
				}>
			>(query);

			if (!Array.isArray(rows)) return [];

			return rows.map((row) => ({
				id: row.id,
				text: row.text,
				source: row.source,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
				deletedAt: row.deleted_at,
				isCustom: Boolean(row.is_custom)
			}));
		} catch {
			return [];
		}
	}

	async saveCustomPassage(input: SaveCustomPassageInput): Promise<GuestPassage> {
		const newId = input.id !== undefined ? String(input.id) : generateUuid();
		const createdAt = getNextPassageCreatedAt(input.createdAt);
		const updatedAt = input.updatedAt ?? createdAt;

		const newPassage: GuestPassage = {
			id: newId,
			text: input.text.trim(),
			source: input.source?.trim() || null,
			createdAt,
			updatedAt,
			deletedAt: input.deletedAt ?? null,
			isCustom: input.isCustom ?? true
		};

		const client = await this.getClient();
		await client.execute(
			`INSERT INTO custom_passages (id, text, source, created_at, updated_at, deleted_at, is_custom)
			 VALUES (?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET
				text = excluded.text,
				source = excluded.source,
				created_at = excluded.created_at,
				updated_at = excluded.updated_at,
				deleted_at = excluded.deleted_at,
				is_custom = excluded.is_custom`,
			[
				newPassage.id,
				newPassage.text,
				newPassage.source,
				newPassage.createdAt,
				newPassage.updatedAt,
				newPassage.deletedAt,
				newPassage.isCustom ? 1 : 0
			]
		);

		return newPassage;
	}

	async updateCustomPassage(
		id: string | number,
		input: { text: string; source?: string | null }
	): Promise<GuestPassage | null> {
		const client = await this.getClient();
		const idStr = String(id);
		const rows = await client.select<
			Array<{
				id: string;
				text: string;
				source: string | null;
				created_at: string;
				updated_at: string;
				deleted_at: string | null;
				is_custom: number;
			}>
		>('SELECT * FROM custom_passages WHERE id = ? LIMIT 1', [idStr]);

		if (!rows || rows.length === 0 || rows[0].deleted_at) {
			return null;
		}

		const existing = rows[0];
		const now = new Date().toISOString();
		const updated: GuestPassage = {
			id: existing.id,
			text: input.text.trim(),
			source: input.source?.trim() || null,
			createdAt: existing.created_at,
			updatedAt: now,
			deletedAt: null,
			isCustom: Boolean(existing.is_custom)
		};

		await client.execute(
			'UPDATE custom_passages SET text = ?, source = ?, updated_at = ? WHERE id = ?',
			[updated.text, updated.source, updated.updatedAt, idStr]
		);

		return updated;
	}

	async deleteCustomPassage(id: string | number): Promise<boolean> {
		const client = await this.getClient();
		const idStr = String(id);
		const rows = await client.select<Array<{ id: string; deleted_at: string | null }>>(
			'SELECT id, deleted_at FROM custom_passages WHERE id = ? LIMIT 1',
			[idStr]
		);

		if (!rows || rows.length === 0 || rows[0].deleted_at) {
			return false;
		}

		const now = new Date().toISOString();
		await client.execute(
			'UPDATE custom_passages SET deleted_at = ?, updated_at = ? WHERE id = ?',
			[now, now, idStr]
		);

		return true;
	}

	async getAllPassages(includeDeleted = false): Promise<GuestPassage[]> {
		const custom = await this.getCustomPassages(includeDeleted);
		return [...DEFAULT_PASSAGES, ...custom];
	}

	async getPassageById(id: string | number, includeDeleted = false): Promise<GuestPassage | null> {
		const all = await this.getAllPassages(includeDeleted);
		return all.find((p) => p.id === id || String(p.id) === String(id)) ?? null;
	}

	async getRandomPassage(lengthFilter: PassageLength = 'all'): Promise<GuestPassage | null> {
		const all = await this.getAllPassages();
		const filtered = filterPassagesByLength(all, lengthFilter);
		if (filtered.length === 0) return null;
		const index = Math.floor(Math.random() * filtered.length);
		return filtered[index];
	}

	async getTestRuns(): Promise<GuestTestRun[]> {
		try {
			const client = await this.getClient();
			const rows = await client.select<
				Array<{
					id: string;
					passage_id: string;
					mode: 'passage' | 'timed';
					duration: number | null;
					wpm: number;
					accuracy: number;
					time_elapsed: number;
					correct_chars: number;
					incorrect_chars: number;
					extra_chars: number;
					missed_chars: number;
					timeline_snapshots: string;
					created_at: string;
					passage_text: string | null;
					passage_source: string | null;
				}>
			>('SELECT * FROM test_runs ORDER BY created_at DESC, id DESC');

			if (!Array.isArray(rows)) return [];

			return rows.map((row) => ({
				id: row.id,
				passageId: row.passage_id,
				mode: row.mode,
				duration: row.duration,
				wpm: row.wpm,
				accuracy: row.accuracy,
				timeElapsed: row.time_elapsed,
				correctChars: row.correct_chars,
				incorrectChars: row.incorrect_chars,
				extraChars: row.extra_chars,
				missedChars: row.missed_chars,
				timelineSnapshots: JSON.parse(row.timeline_snapshots || '[]'),
				createdAt: row.created_at,
				passage:
					row.passage_text !== null
						? {
								id: row.passage_id,
								text: row.passage_text,
								source: row.passage_source
							}
						: null
			}));
		} catch {
			return [];
		}
	}

	async saveTestRun(result: SaveTestRunInput): Promise<GuestTestRun> {
		const newId = result.id !== undefined ? String(result.id) : generateUuid();
		const pId = String(result.passageId);

		let matchedPassage = result.passage;
		if (matchedPassage === undefined) {
			const allPassages = await this.getAllPassages();
			const found = allPassages.find((p) => String(p.id) === pId);
			matchedPassage = found
				? {
						id: found.id,
						text: found.text,
						source: found.source
					}
				: null;
		}

		const newRun: GuestTestRun = {
			id: newId,
			passageId: pId,
			mode: result.mode,
			duration: result.duration,
			wpm: result.wpm,
			accuracy: result.accuracy,
			timeElapsed: result.timeElapsed,
			correctChars: result.correctChars,
			incorrectChars: result.incorrectChars,
			extraChars: result.extraChars,
			missedChars: result.missedChars,
			timelineSnapshots: result.timelineSnapshots ?? [],
			createdAt: getNextRunCreatedAt(result.createdAt),
			passage: matchedPassage
		};

		const client = await this.getClient();
		await client.execute(
			`INSERT INTO test_runs (
				id, passage_id, mode, duration, wpm, accuracy, time_elapsed,
				correct_chars, incorrect_chars, extra_chars, missed_chars,
				timeline_snapshots, created_at, passage_text, passage_source
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET
				passage_id = excluded.passage_id,
				mode = excluded.mode,
				duration = excluded.duration,
				wpm = excluded.wpm,
				accuracy = excluded.accuracy,
				time_elapsed = excluded.time_elapsed,
				correct_chars = excluded.correct_chars,
				incorrect_chars = excluded.incorrect_chars,
				extra_chars = excluded.extra_chars,
				missed_chars = excluded.missed_chars,
				timeline_snapshots = excluded.timeline_snapshots,
				created_at = excluded.created_at,
				passage_text = excluded.passage_text,
				passage_source = excluded.passage_source`,
			[
				newRun.id,
				newRun.passageId,
				newRun.mode,
				newRun.duration,
				newRun.wpm,
				newRun.accuracy,
				newRun.timeElapsed,
				newRun.correctChars,
				newRun.incorrectChars,
				newRun.extraChars,
				newRun.missedChars,
				JSON.stringify(newRun.timelineSnapshots),
				newRun.createdAt,
				newRun.passage?.text ?? null,
				newRun.passage?.source ?? null
			]
		);

		return newRun;
	}

	async clearTestRuns(): Promise<void> {
		try {
			const client = await this.getClient();
			await client.execute('DELETE FROM test_runs');
		} catch {
			// Ignore if db unavailable
		}
	}

	async getGuestData(includeDeleted = false): Promise<GuestData> {
		const [settings, customPassages, testRuns] = await Promise.all([
			this.getSettings(),
			this.getCustomPassages(includeDeleted),
			this.getTestRuns()
		]);

		return {
			settings,
			customPassages,
			testRuns
		};
	}

	async clearGuestData(): Promise<void> {
		try {
			const client = await this.getClient();
			await client.execute('DELETE FROM custom_passages');
			await client.execute('DELETE FROM test_runs');
			await client.execute(
				`INSERT INTO guest_settings (id, mode, duration, passage_length, zen_mode, theme, scroll_mode, updated_at, deleted_at)
				 VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
				 ON CONFLICT(id) DO UPDATE SET
					mode = excluded.mode,
					duration = excluded.duration,
					passage_length = excluded.passage_length,
					zen_mode = excluded.zen_mode,
					theme = excluded.theme,
					scroll_mode = excluded.scroll_mode,
					updated_at = excluded.updated_at,
					deleted_at = excluded.deleted_at`,
				[
					DEFAULT_GUEST_SETTINGS.mode,
					DEFAULT_GUEST_SETTINGS.duration,
					DEFAULT_GUEST_SETTINGS.passageLength,
					DEFAULT_GUEST_SETTINGS.zenMode ? 1 : 0,
					DEFAULT_GUEST_SETTINGS.theme,
					DEFAULT_GUEST_SETTINGS.scrollMode,
					DEFAULT_GUEST_SETTINGS.updatedAt,
					DEFAULT_GUEST_SETTINGS.deletedAt
				]
			);
		} catch {
			// Ignore if db unavailable
		}
	}

	async getSyncAccount(): Promise<SyncAccount | null> {
		try {
			const client = await this.getClient();
			const rows = await client.select<
				Array<{
					id: number;
					server_url: string;
					token: string;
					user_json: string;
					last_synced_at: string | null;
				}>
			>('SELECT * FROM sync_account WHERE id = 1 LIMIT 1');

			if (!rows || rows.length === 0) return null;

			const row = rows[0];
			return {
				serverUrl: row.server_url,
				token: row.token,
				user: JSON.parse(row.user_json),
				lastSyncedAt: row.last_synced_at
			};
		} catch {
			return null;
		}
	}

	async saveSyncAccount(account: SyncAccount): Promise<void> {
		const client = await this.getClient();
		await client.execute(
			`INSERT INTO sync_account (id, server_url, token, user_json, last_synced_at)
			 VALUES (1, ?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET
				server_url = excluded.server_url,
				token = excluded.token,
				user_json = excluded.user_json,
				last_synced_at = excluded.last_synced_at`,
			[account.serverUrl, account.token, JSON.stringify(account.user), account.lastSyncedAt ?? null]
		);
	}

	async clearSyncAccount(): Promise<void> {
		try {
			const client = await this.getClient();
			await client.execute('DELETE FROM sync_account WHERE id = 1');
		} catch {
			// Ignore if db unavailable
		}
	}
}
