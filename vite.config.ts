import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), svelteTesting()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		setupFiles: ['./vitest-setup.ts']
	}
});
