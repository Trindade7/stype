import type { LocalStoreAdapter } from './types';
import { IndexedDbStoreAdapter } from './indexeddb';
import { MemoryStoreAdapter } from './memory';
import { SqliteStoreAdapter } from './sqlite';
import { migrateFromLocalStorage } from './migration';

export * from './types';
export * from './indexeddb';
export * from './memory';
export * from './sqlite';
export * from './migration';

let defaultAdapter: LocalStoreAdapter | null = null;
let migrationPromise: Promise<boolean> | null = null;

export function isNativePlatform(): boolean {
	if (typeof window === 'undefined') return false;
	const win = window as unknown as {
		__TAURI_INTERNALS__?: unknown;
		__TAURI__?: unknown;
		isTauri?: unknown;
	};
	return Boolean(win.__TAURI_INTERNALS__ || win.__TAURI__ || win.isTauri);
}

export function getDefaultAdapter(): LocalStoreAdapter {
	if (!defaultAdapter) {
		if (isNativePlatform()) {
			defaultAdapter = new SqliteStoreAdapter();
		} else if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
			defaultAdapter = new IndexedDbStoreAdapter();
		} else {
			defaultAdapter = new MemoryStoreAdapter();
		}
	}
	return defaultAdapter;
}

export function setAdapter(adapter: LocalStoreAdapter | null): void {
	defaultAdapter = adapter;
	migrationPromise = null;
}

export async function ensureMigrated(adapter: LocalStoreAdapter = getDefaultAdapter()): Promise<boolean> {
	if (!migrationPromise) {
		migrationPromise = migrateFromLocalStorage(adapter);
	}
	return migrationPromise;
}

export function resetMigrationStatus(): void {
	migrationPromise = null;
}
