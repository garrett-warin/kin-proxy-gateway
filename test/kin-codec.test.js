import assert from "node:assert/strict";
import test from "node:test";

await import("../public/kin-codec.js");

const { encode, decode } = globalThis.KinPathCodec;

test("obfuscates and restores search and navigation URLs", () => {
	const urls = [
		"https://www.bing.com/search?q=bonfire+proxy&form=QBLH",
		"https://example.com/a/path?message=hello%20world#section-2",
		"https://例え.テスト/こんにちは?q=火",
	];

	for (const url of urls) {
		const encoded = encode(url);
		assert.match(encoded, /^k1_[A-Za-z0-9_-]+$/);
		assert.equal(encoded.includes("http"), false);
		assert.equal(encoded.includes("search"), false);
		assert.equal(decode(encoded), url);
	}
});

test("decoder keeps old percent-encoded Bonfire routes working", () => {
	const url = "https://example.com/legacy?q=1";
	assert.equal(decode(encodeURIComponent(url)), url);
});

test("serialized codec functions remain self-contained", () => {
	const serializedEncode = Function(`return (${encode.toString()})`)();
	const serializedDecode = Function(`return (${decode.toString()})`)();
	const url = "https://example.com/from-worker?q=unicode-%E2%9C%93";
	assert.equal(serializedDecode(serializedEncode(url)), url);
});
