import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const publicPath = fileURLToPath(new URL("../public/", import.meta.url));
const tokenSecret = process.env.KIN_TOKEN_SECRET;
const accessGateUrl = "https://script.google.com/a/macros/fcpsschools.net/s/AKfycbw6cusU0GMU3G1aw69gavCCOShiBXZ_W-cXG8Wo7s8i0PNTJaf2Th6LwNwj5oEfVSXf/exec";

if (!tokenSecret) throw new Error("KIN_TOKEN_SECRET is required.");

function fromBase64Url(value) {
	return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function verifyKinToken(token) {
	if (!token || token.length > 4096) return null;
	const [header, payload, signature] = token.split(".");
	if (!header || !payload || !signature) return null;
	const expected = createHmac("sha256", tokenSecret).update(`${header}.${payload}`).digest();
	const supplied = fromBase64Url(signature);
	if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
	try {
		const claims = JSON.parse(fromBase64Url(payload).toString("utf8"));
		if (claims.iss !== "kin-fcps" || typeof claims.email !== "string" || typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000)) return null;
		return claims;
	} catch { return null; }
}

function cookieValue(header, name) {
	return String(header || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}

// Wisp Configuration: Refer to the documentation at https://www.npmjs.com/package/@mercuryworkshop/wisp-js

logging.set_level(logging.NONE);
Object.assign(wisp.options, {
	allow_udp_streams: false,
	hostname_blacklist: [/example\.com/],
	dns_servers: ["1.1.1.3", "1.0.0.3"],
});

const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url.endsWith("/wisp/") && verifyKinToken(cookieValue(req.headers.cookie, "kin_session"))) wisp.routeRequest(req, socket, head);
				else socket.end();
			});
	},
});

fastify.addHook("onRequest", async (request, reply) => {
	const url = new URL(request.raw.url, "http://kin.local");
	const incomingToken = url.searchParams.get("kin_token");
	if (incomingToken) {
		const claims = verifyKinToken(incomingToken);
		if (!claims) return reply.code(403).type("text/html").send("<h1>Kin access denied</h1><p>Your FCPS access link is invalid or expired. Return to Kin and try again.</p>");
		url.searchParams.delete("kin_token");
		reply.header("Set-Cookie", `kin_session=${incomingToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.max(1, claims.exp - Math.floor(Date.now() / 1000))}`);
		return reply.redirect(`${url.pathname}${url.search}`, 302);
	}
	if (!verifyKinToken(cookieValue(request.headers.cookie, "kin_session"))) {
		// The main Kin address is the friendly entry point. Authentication happens
		// in the FCPS Apps Script Web App before it redirects back with a token.
		if (url.pathname === "/" && (request.method === "GET" || request.method === "HEAD")) {
			return reply.redirect(accessGateUrl, 302);
		}
		return reply.code(403).type("text/html").send("<h1>Kin access required</h1><p>Start from the FCPS Kin page to continue.</p>");
	}
});

fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
});

fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scram/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: libcurlPath,
	prefix: "/libcurl/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decorateReply: false,
});

fastify.setNotFoundHandler((res, reply) => {
	return reply.code(404).type("text/html").sendFile("404.html");
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();

	// by default we are listening on 0.0.0.0 (every interface)
	// we just need to list a few
	console.log("Listening on:");
	console.log(`\thttp://localhost:${address.port}`);
	console.log(`\thttp://${hostname()}:${address.port}`);
	console.log(
		`\thttp://${
			address.family === "IPv6" ? `[${address.address}]` : address.address
		}:${address.port}`
	);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("SIGTERM signal received: closing HTTP server");
	fastify.close();
	process.exit(0);
}

let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 8080;

fastify.listen({
	port: port,
	host: "0.0.0.0",
});
