# Kin FCPS gateway

This is the official Scramjet application with an FCPS access gate added.

Deploy this folder to Koyeb as a Docker application. Add one secret environment
variable before deployment:

- `KIN_TOKEN_SECRET` — the value created by `initializeKinService` in the Kin
  Apps Script project.

Every request, including Scramjet's WebSocket transport, requires a valid,
short-lived signed token. Kin's Apps Script page will redirect approved FCPS
users to this service with a token once its public Koyeb URL is configured.

Do not make a separate unauthenticated route to this application: a direct
Koyeb URL must show “Kin access required.”
