import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { createDeviceSession, verifyDeviceSession, verifyLaunchToken } from "../src/auth.js";

const secret = "test-secret";

function launchToken(claims) {
	const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
	const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
	const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
	return `${header}.${payload}.${signature}`;
}

test("exchanges a short launch token for a durable device session", () => {
	const launch = launchToken({ iss: "kin-fcps", email: "1771159@fcpsschools.net", name: "Garrett", iat: 900, exp: 1300 });
	const claims = verifyLaunchToken(launch, secret, 1000);
	const session = createDeviceSession(claims, secret, 31_536_000, 1000);
	assert.deepEqual(verifyDeviceSession(session, secret, 2000), {
		iss: "kin-device",
		email: "1771159@fcpsschools.net",
		name: "Garrett",
		iat: 1000,
		exp: 31_537_000,
	});
});

test("does not accept an expired launch token", () => {
	const launch = launchToken({ iss: "kin-fcps", email: "1771159@fcpsschools.net", exp: 999 });
	assert.equal(verifyLaunchToken(launch, secret, 1000), null);
});

test("does not accept a launch token as a device session", () => {
	const launch = launchToken({ iss: "kin-fcps", email: "1771159@fcpsschools.net", exp: 1300 });
	assert.equal(verifyDeviceSession(launch, secret, 1000), null);
});
