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

if (typeof globalThis.EventSource === 'undefined') {
	class MockEventSource {
		url: string;
		readyState = 1;
		onopen: ((e: any) => void) | null = null;
		onmessage: ((e: any) => void) | null = null;
		onerror: ((e: any) => void) | null = null;
		private listeners: Record<string, Function[]> = {};

		constructor(url: string) {
			this.url = url;
		}

		addEventListener(type: string, listener: Function) {
			this.listeners[type] = this.listeners[type] || [];
			this.listeners[type].push(listener);
		}

		removeEventListener(type: string, listener: Function) {
			if (this.listeners[type]) {
				this.listeners[type] = this.listeners[type].filter((fn) => fn !== listener);
			}
		}

		close() {
			this.readyState = 2;
		}
	}

	(globalThis as any).EventSource = MockEventSource;
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

