# Kin Bonfire Gateway

Kin is a browser-style web workspace powered by the Bonfire engine. It combines
tabs, configurable search, bookmarks, local history controls, and an FCPS
verification gate in one branded interface.

## Engine

Bonfire handles page transformation, loading, navigation, and the Kin relay.
Its browser runtime is split across the neutral `public/runtime/`,
`public/controller/`, and `public/clients/` paths. Kin supplies the interface
and local workspace features around that engine.

## Requirements

- Node.js 16 or newer
- npm 7 or newer
- A `KIN_TOKEN_SECRET` shared with the Kin Apps Script verification service

## Run locally

```sh
npm install
KIN_TOKEN_SECRET="your-shared-secret" npm start
```

The server listens on port `8080` unless `PORT` is set. Every route requires a
valid, short-lived Kin token. Direct unauthenticated visits are sent to the FCPS
verification page.

## Deployment

Kin can run from the included Dockerfile or directly with Node. The deployed
gateway is designed to sit behind CloudFront while Apps Script handles FCPS
identity verification.

Required environment variable:

- `KIN_TOKEN_SECRET` — HMAC secret shared by Apps Script and the Kin gateway

## Transport

The public client connects through `/relay/`. Run `npm run verify:surface`
before deployment to verify the pinned runtime hashes and ensure internal
implementation identifiers are absent from every browser-delivered asset.

## License

See [LICENSE](./LICENSE) and [public/credits.html](./public/credits.html).
