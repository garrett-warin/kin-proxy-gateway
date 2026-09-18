import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
import { server as relayEngine, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify, { LogController } from "fastify";
import fastifyStatic from "@fastify/static";

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

function safeReturnPath(value) {
	if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.length > 2048) return "/";
	return value;
}

function decodedCookieValue(header, name) {
	try { return decodeURIComponent(cookieValue(header, name)); } catch { return "/"; }
}

function trustedPublicOrigin(request) {
	const candidates = [
		request.headers["x-kin-public-origin"],
		request.headers["x-forwarded-host"],
		request.headers.host,
	];
	for (const candidate of candidates) {
		if (!candidate) continue;
		const raw = String(candidate).split(",")[0].trim();
		try {
			const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
			const hostname = parsed.hostname.toLowerCase();
			const trusted = /^[a-z0-9-]+\.cloudfront\.net$/.test(hostname) || hostname === "kinfire-gateway-garrett.fly.dev";
			if (parsed.protocol === "https:" && trusted) return parsed.origin;
		} catch {}
	}
	return "https://kinfire-gateway-garrett.fly.dev";
}

// Internal relay configuration. Browser-facing routes and assets use Kin names.

logging.set_level(logging.NONE);
Object.assign(relayEngine.options, {
	allow_udp_streams: false,
	hostname_blacklist: [/example\.com/],
	dns_servers: ["1.1.1.3", "1.0.0.3"],
});

const fastify = Fastify({
	logger: false,
	logController: new LogController({ disableRequestLogging: true }),
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url.endsWith("/relay/") && verifyKinToken(cookieValue(req.headers.cookie, "kin_session"))) relayEngine.routeRequest(req, socket, head);
				else socket.end();
			});
	},
});

fastify.addHook("onSend", async (_request, reply, payload) => {
	reply.header("Cache-Control", "private, no-store");
	reply.header("Pragma", "no-cache");
	reply.header("Referrer-Policy", "no-referrer");
	reply.header("X-Robots-Tag", "noindex, nofollow, noarchive");
	return payload;
});

fastify.addHook("onRequest", async (request, reply) => {
	const url = new URL(request.raw.url, "http://kin.local");
	if (url.pathname === "/auth/start") {
		const returnPath = safeReturnPath(url.searchParams.get("return_path"));
		const gate = new URL(accessGateUrl);
		gate.searchParams.set("return_origin", trustedPublicOrigin(request));
		reply.header("Set-Cookie", `kin_return_path=${encodeURIComponent(returnPath)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
		return reply.redirect(gate.toString(), 302);
	}
	const incomingToken = url.searchParams.get("kin_token");
	if (incomingToken) {
		const claims = verifyKinToken(incomingToken);
		if (!claims) return reply.redirect(`/auth/start?return_path=${encodeURIComponent("/")}`, 302);
		url.searchParams.delete("kin_token");
		const savedReturnPath = safeReturnPath(decodedCookieValue(request.headers.cookie, "kin_return_path"));
		reply.header("Set-Cookie", [
			`kin_session=${incomingToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.max(1, claims.exp - Math.floor(Date.now() / 1000))}`,
			"kin_return_path=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
		]);
		return reply.redirect(savedReturnPath === "/" ? `${url.pathname}${url.search}` : savedReturnPath, 302);
	}
	if (!verifyKinToken(cookieValue(request.headers.cookie, "kin_session"))) {
		const isDocument = request.headers["sec-fetch-dest"] === "document" || String(request.headers.accept || "").includes("text/html");
		if (isDocument && (request.method === "GET" || request.method === "HEAD")) {
			const returnPath = safeReturnPath(`${url.pathname}${url.search}`);
			return reply.redirect(`/auth/start?return_path=${encodeURIComponent(returnPath)}`, 302);
		}
		return reply.code(401).type("application/json").send({ error: "verification_required", verify: "/auth/start" });
	}
});

fastify.get("/api/session", async (request, reply) => {
	const claims = verifyKinToken(cookieValue(request.headers.cookie, "kin_session"));
	const name = typeof claims?.name === "string" ? claims.name.trim() : "";
	const fallback = claims?.email?.split("@")[0] || "friend";
	const firstName = (name || fallback).split(/\s+/)[0].slice(0, 40);
	return reply.header("Cache-Control", "private, no-store").send({ firstName });
});

fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
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
