importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $kinfireLoadWorker();
const kinfire = new ScramjetServiceWorker();

async function handleRequest(event) {
	await kinfire.loadConfig();
	if (kinfire.route(event)) {
		return kinfire.fetch(event);
	}
	return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event));
});
