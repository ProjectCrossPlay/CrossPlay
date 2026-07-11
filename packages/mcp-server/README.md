# @projectcrossplay/mcp-server

Exposes [CrossPlay](https://github.com/ProjectCrossPlay/projectcrossplay) to AI coding agents over the [Model Context Protocol](https://modelcontextprotocol.io): run tests, check environment health, read trace failures, and scaffold a new project — all through tools an agent can call directly.

> ⚠️ **Run this with caution.** The `crossplay_test` tool executes real code — it runs your test suite via Node/Vitest. Granting an agent access to this server is equivalent to giving it local shell access to this project. **Run it inside a sandbox you control** (a container, a VM, or a restricted/ephemeral OS user) — it is not a safe default for an untrusted or multi-tenant caller. The server prints this same warning to stderr on every startup, and again each time `crossplay_test` is invoked. See [`docs/mcp-server.md`](https://github.com/ProjectCrossPlay/projectcrossplay/blob/main/docs/mcp-server.md) for the full trust model.

## Install

```bash
npm install -D @projectcrossplay/mcp-server
```

Configure your MCP client to launch `crossplay-mcp` (the package's bin) over stdio. Transport is local-stdio-only by design — no network transport is exposed.

## Tools

| Tool | Purpose | Input |
|---|---|---|
| `crossplay_doctor` | Check the local environment (Node, config, Playwright browsers, ADB/device) | none |
| `crossplay_test` | ⚠️ Run the test suite for one or more targets | `target?`, `specPath?` |
| `crossplay_read_trace` | Read a `.trace` file: action log, per-step errors, DOM hierarchy dumps (screenshot bytes never embedded, only referenced by name) | `tracePath` |
| `crossplay_scaffold` | Scaffold `crossplay.config.mts` + an example spec (never overwrites existing files) | `ci?` |

All file-path inputs (`specPath`, `tracePath`) are validated against the workspace root the server was started in — a path that resolves outside it is rejected.

## License

Apache-2.0
