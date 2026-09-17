"use strict";

// Keep both functions self-contained. Bonfire serializes them into the page,
// workers, and request controller that rewrite and recover destination URLs.
globalThis.KinPathCodec = Object.freeze({
	encode: function kinPathEncode(input) {
		if (!input) return input;
		const bytes = new TextEncoder().encode(input);
		let binary = "";
		for (let index = 0; index < bytes.length; index += 1) {
			const mask = (index * 31 + 93) & 255;
			binary += String.fromCharCode(bytes[index] ^ mask);
		}
		return `k1_${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")}`;
	},
	decode: function kinPathDecode(input) {
		if (!input) return input;
		if (!input.startsWith("k1_")) {
			try {
				return decodeURIComponent(input);
			} catch {
				return input;
			}
		}

		const encoded = input.slice(3).replace(/-/g, "+").replace(/_/g, "/");
		const binary = atob(encoded + "=".repeat((4 - (encoded.length % 4)) % 4));
		const bytes = new Uint8Array(binary.length);
		for (let index = 0; index < binary.length; index += 1) {
			const mask = (index * 31 + 93) & 255;
			bytes[index] = binary.charCodeAt(index) ^ mask;
		}
		return new TextDecoder().decode(bytes);
	},
});
