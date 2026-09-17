import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("public");
const manifest = JSON.parse(await readFile(new URL("./runtime-fork.json", import.meta.url), "utf8"));
const restricted = /scramjet|scram|wisp|bare|libcurl|epoxy|ultraviolet|__uv|uvConfig|rewriteHTML|rewriteCSS|rewriteJS|rewriteUrl|proxyUrl|unproxyUrl|encodeUrl|decodeUrl|service-worker|service_worker/i;
const publicExtensions = new Set([".css", ".html", ".js", ".json", ".mjs", ".svg", ".txt", ".wasm"]);

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

for (const [asset, expected] of Object.entries(manifest.assets)) {
  const bytes = await readFile(path.join(root, asset));
  const actual = hash(bytes);
  if (actual !== expected) throw new Error(`Runtime hash mismatch for ${asset}: ${actual}`);
}

let checked = 0;
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(file);
      continue;
    }
    if (!publicExtensions.has(path.extname(entry.name))) continue;
    const relative = path.relative(root, file).replaceAll("\\", "/");
    const bytes = await readFile(file);
    if (restricted.test(relative) || restricted.test(bytes.toString("latin1"))) {
      throw new Error(`Restricted implementation name remains in public/${relative}`);
    }
    checked += 1;
  }
}

await walk(root);
console.log(`PUBLIC_SURFACE_VERIFIED files=${checked} runtime_assets=${Object.keys(manifest.assets).length} commit=${manifest.commit}`);
