import { readFile, writeFile } from "node:fs/promises";

const textAssets = [
  "public/bootstrap/bootstrap-client.js",
  "public/runtime/runtimekit.js",
  "public/runtime/runtimekit-utils.js",
  "public/controller/controller.api.js",
  "public/controller/controller.inject.js",
  "public/controller/controller.worker.js",
  "public/clients/httpengine-client.js",
];

const replacements = [
  [/SCRAMJET/g, "RUNTIMEKIT"], [/Scramjet/g, "RuntimeKit"], [/scramjet/g, "runtimekit"],
  [/SCRAM/g, "RTIME"], [/Scram/g, "Rtime"], [/scram/g, "rtime"],
  [/WISP/g, "RELAY"], [/Wisp/g, "Relay"], [/wisp/g, "relay"],
  [/BARE/g, "CHANNEL"], [/Bare/g, "Channel"], [/bare/g, "channel"],
  [/LIBCURL/g, "HTTPENGINE"], [/Libcurl/g, "HttpEngine"], [/libcurl/g, "httpengine"],
  [/EPOXY/g, "NETENGINE"], [/Epoxy/g, "NetEngine"], [/epoxy/g, "netengine"],
  [/ULTRAVIOLET/g, "SPECTRUM"], [/Ultraviolet/g, "Spectrum"], [/ultraviolet/g, "spectrum"],
  [/__UV/g, "__SPECTRUM"], [/__uv/g, "__spectrum"], [/uvConfig/g, "spectrumConfig"],
  [/rewriteHTML/g, "transformHTML"], [/rewriteHtml/g, "transformHtml"],
  [/rewriteCSS/g, "transformCSS"], [/rewriteCss/g, "transformCss"],
  [/rewriteJS/g, "transformJS"], [/rewriteJs/g, "transformJs"],
  [/unrewriteurl/gi, "restoreurl"], [/rewriteUrl/g, "transformUrl"], [/unrewriteUrl/g, "restoreUrl"],
  [/proxyUrl/g, "routeUrl"], [/unproxyUrl/g, "restoreUrl"],
  [/encodeUrl/g, "packUrl"], [/decodeUrl/g, "unpackUrl"],
  [/service-worker/g, "background-worker"], [/service_worker/g, "background_worker"],
  [/SwPath/g, "WorkerPath"], [/swPath/g, "workerPath"],
  [/controller\.sw\.js/g, "controller.worker.js"], [/\/~\/sj\//g, "/~/app/"],
];

for (const file of textAssets) {
  let content = await readFile(file, "utf8");
  const payloads = [];
  content = content.replace(/"data:application\/octet-stream;base64,[A-Za-z0-9+/=]+"/g, (payload) => {
    const token = `__KIN_BINARY_${payloads.length}__`;
    payloads.push(payload.slice(1, -1));
    return token;
  });
  for (const [pattern, replacement] of replacements) content = content.replace(pattern, replacement);
  payloads.forEach((payload, index) => {
    const fragments = [];
    let cursor = 0;
    for (const match of payload.matchAll(/scramjet|scram|wisp|bare|libcurl|epoxy|ultraviolet|__uv/gi)) {
      const midpoint = match.index + Math.max(1, Math.floor(match[0].length / 2));
      fragments.push(payload.slice(cursor, midpoint));
      cursor = midpoint;
    }
    fragments.push(payload.slice(cursor));
    content = content.replace(`__KIN_BINARY_${index}__`, `[${fragments.map((fragment) => JSON.stringify(fragment)).join(",")}].join("")`);
  });
  await writeFile(file, content);
}

let wasm = await readFile("public/runtime/runtimekit.wasm");
for (const [from, to] of [
  [Buffer.from("scram"), Buffer.from("rtime")],
  [Buffer.from("SCRAM"), Buffer.from("RTIME")],
  [Buffer.from("encodeUrl"), Buffer.from("packUri__")],
  [Buffer.from("encodeurl"), Buffer.from("packuri__")],
]) {
  for (let offset = wasm.indexOf(from); offset !== -1; offset = wasm.indexOf(from, offset + to.length)) to.copy(wasm, offset);
}
await writeFile("public/runtime/runtimekit.wasm", wasm);

console.log("Kin runtime public names sanitized.");
