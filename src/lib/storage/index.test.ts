import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	getDefaultAdapter,
	setAdapter,
	isNativePlatform,
	IndexedDbStoreAdapter,
	MemoryStoreAdapter
} from './index';
import { SqliteStoreAdapter } from './sqlite';

describe('Storage platform detection and default adapter', () => {
	beforeEach(() => {
		setAdapter(null);
	});

	afterEach(() => {
		setAdapter(null);
		delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
		delete (window as unknown as Record<string, unknown>).__TAURI__;
		delete (window as unknown as Record<string, unknown>).isTauri;
	});

	it('identifies non-native browser environment', () => {
		expect(isNativePlatform()).toBe(false);
	});

	it('identifies native Tauri environment when __TAURI_INTERNALS__ is present', () => {
		(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
		expect(isNativePlatform()).toBe(true);
	});

	it('returns SqliteStoreAdapter when running in native environment', () => {
		(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
		const adapter = getDefaultAdapter();
		expect(adapter).toBeInstanceOf(SqliteStoreAdapter);
	});

	it('returns IndexedDbStoreAdapter in standard web browser', () => {
		const adapter = getDefaultAdapter();
		expect(adapter).toBeInstanceOf(IndexedDbStoreAdapter);
	});
});
