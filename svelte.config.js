import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';

/**
 * Returns the SvelteKit adapter based on environment configuration.
 * When STATIC_BUILD is '1' or 'true', adapter-static with index.html fallback is used.
 * Otherwise, adapter-node is used for server builds.
 *
 * @param {Record<string, string | undefined>} [env]
 */
export function getAdapter(env = process.env) {
	const isStatic = env.STATIC_BUILD === '1' || env.STATIC_BUILD === 'true';
	return isStatic
		? adapterStatic({
				fallback: 'index.html',
				strict: false
			})
		: adapterNode();
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},
	kit: {
		adapter: getAdapter()
	}
};

export default config;
