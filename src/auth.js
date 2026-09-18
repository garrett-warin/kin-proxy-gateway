import { createHmac, timingSafeEqual } from "node:crypto";

function toBase64Url(value) {
	return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value) {
	return Buffer.from(value, "base64url");
}

function decodeSignedToken(token, secret) {
	if (!token || token.length > 4096) return null;
	const [header, payload, signature] = token.split(".");
	if (!header || !payload || !signature) return null;
	const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest();
	const supplied = fromBase64Url(signature);
	if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
	try {
		return JSON.parse(fromBase64Url(payload).toString("utf8"));
	} catch {
		return null;
	}
}

function hasIdentity(claims) {
	return claims && typeof claims.email === "string" && typeof claims.exp === "number";
}

export function verifyLaunchToken(token, secret, now = Math.floor(Date.now() / 1000)) {
	const claims = decodeSignedToken(token, secret);
	if (!hasIdentity(claims) || claims.iss !== "kin-fcps" || claims.exp <= now) return null;
	return claims;
}

export function createDeviceSession(claims, secret, lifetimeSeconds, now = Math.floor(Date.now() / 1000)) {
	const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
	const payload = toBase64Url(JSON.stringify({
		iss: "kin-device",
		email: claims.email,
		name: typeof claims.name === "string" ? claims.name : "",
		iat: now,
		exp: now + lifetimeSeconds,
	}));
	const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
	return `${header}.${payload}.${signature}`;
}

export function verifyDeviceSession(token, secret, now = Math.floor(Date.now() / 1000)) {
	const claims = decodeSignedToken(token, secret);
	if (!hasIdentity(claims) || claims.iss !== "kin-device" || claims.exp <= now) return null;
	return claims;
}
