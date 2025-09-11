# Codex Workflow Guide (Updates)

## Invariants
- All API endpoints must return JSON with `Content-Type: application/json`; no HTML fallbacks allowed.
- Server-truth only: UI may not use client heuristics for org/role/demo; call whoami/authorize instead.

## Testing Rules
- Protected routes must preflight `POST /functions/v1/authorize` with `{ path, method }`.
- Include cURL examples (see `docs/demo_sections.md` and `scripts/verify-demo-foundation.md`).
- Frontend fetches must verify content-type via a guard before parsing JSON.

