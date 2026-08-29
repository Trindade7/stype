import { describe, it, expect } from 'vitest';
import { getAdapter } from '../svelte.config.js';

describe('Adapter Configuration', () => {
	it('uses @sveltejs/adapter-static when STATIC_BUILD is "1"', () => {
		const adapter = getAdapter({ STATIC_BUILD: '1' });
		expect(adapter.name).toBe('@sveltejs/adapter-static');
	});

	it('uses @sveltejs/adapter-static when STATIC_BUILD is "true"', () => {
		const adapter = getAdapter({ STATIC_BUILD: 'true' });
		expect(adapter.name).toBe('@sveltejs/adapter-static');
	});

	it('uses @sveltejs/adapter-node when STATIC_BUILD is unset', () => {
		const adapter = getAdapter({});
		expect(adapter.name).toBe('@sveltejs/adapter-node');
	});

	it('uses @sveltejs/adapter-node when STATIC_BUILD is "0"', () => {
		const adapter = getAdapter({ STATIC_BUILD: '0' });
		expect(adapter.name).toBe('@sveltejs/adapter-node');
	});

	it('uses @sveltejs/adapter-node when STATIC_BUILD is "false"', () => {
		const adapter = getAdapter({ STATIC_BUILD: 'false' });
		expect(adapter.name).toBe('@sveltejs/adapter-node');
	});
});
