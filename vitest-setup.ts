import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterAll } from 'vitest';

if (typeof Element !== 'undefined') {
	if (!Element.prototype.hasPointerCapture) {
		Element.prototype.hasPointerCapture = () => false;
	}
	if (!Element.prototype.setPointerCapture) {
		Element.prototype.setPointerCapture = () => {};
	}
	if (!Element.prototype.releasePointerCapture) {
		Element.prototype.releasePointerCapture = () => {};
	}
	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = () => {};
	}
}

afterAll(async () => {
	// Guard against trailing timeouts (such as bits-ui body-scroll-lock cleanup)
	// accessing global `document` after the jsdom environment has been torn down.
	await new Promise((resolve) => setTimeout(resolve, 100));
	if (typeof globalThis.document === 'undefined') {
		(globalThis as any).document = {
			body: {
				setAttribute: () => {},
				style: { removeProperty: () => {} }
			}
		};
	}
});

