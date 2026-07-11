# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately via GitHub Security Advisories on this repository ("Report a vulnerability"). Do not open public issues for security reports. We aim to acknowledge within 72 hours.

## Scope & design commitments (v0.1)

- All local servers (trace viewer, device port-forwards) bind to `127.0.0.1` only; the trace viewer additionally uses an ephemeral port, a random path token, and a strict CSP (`frame-ancestors 'none'`, no external origins) so nothing else on the machine — or a page in a browser tab — can reach or embed it.
- Trace files are treated as untrusted input by the viewer: parsed the same way regardless of source (server-fetched or drag-and-dropped), strict format validation, and hierarchy dumps are rendered via `DOMParser` (never executed, never `innerHTML`) as text-only Preact elements.
- Values entered via `fill()` are masked in the trace's **text log** by default (`•••••••`, opt out per-call with `{ mask: false }`). This does not extend to screenshots: if the field you filled isn't a real `<input type="password">` (or is otherwise rendered as visible text by the app), the entered value will still be visible in the screenshot pixels for that step. Use `trace: 'retain-on-failure'` and review what you're capturing if a spec touches genuinely sensitive data.
- Dependencies are locked and audited in CI (fail on high/critical advisories on every push); the full production dependency tree has been reviewed for license compatibility (permissive or compatible weak-copyleft only — no GPL/AGPL/LGPL). Published to npm with provenance since v0.1.0.

## MCP server: a real code-execution surface, by design

`@projectcrossplay/mcp-server`'s `crossplay_test` tool runs your test suite via Node/Vitest on behalf of whatever calls it. This is not a vulnerability to be patched — it's the tool's actual job — but it means granting an agent access to this server is equivalent to giving it local shell access to this project. **Run it inside a sandbox you control** (a container, a VM, or a restricted/ephemeral OS user), never as a safe default for an untrusted or multi-tenant caller. See [`docs/mcp-server.md`](docs/mcp-server.md) for the full trust model. Mitigations in place (reduce risk, don't eliminate it): local-stdio-only transport (no network transport is exposed), a workspace-root path guard on every file-path tool input, and a caution notice printed at server startup and at every `crossplay_test` invocation.

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | ✔ (latest release) |
