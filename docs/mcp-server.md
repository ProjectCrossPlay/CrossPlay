# MCP Server

`@projectcrossplay/mcp-server` exposes CrossPlay to AI coding agents over the [Model Context Protocol](https://modelcontextprotocol.io): an agent can check your environment, run tests, read trace failures, and scaffold a new project directly, instead of shelling out to the CLI and parsing terminal output.

## ⚠️ Read this before enabling it

**`crossplay_test` executes real code.** It runs your test suite via Node/Vitest. Granting an agent access to this server is equivalent to giving it local shell access to run tests in this project — not a hypothetical risk, a direct consequence of what the tool does. This is a documented trust boundary, not a sandbox: the server does not, and cannot, safely contain what a test file or a misdirected agent chooses to execute.

**Run this server inside a sandbox you control** — a container, a VM, or a restricted/ephemeral OS user — whenever you wire it up for an agent to call. This is not a safe default for an untrusted or multi-tenant caller. The server prints this same warning to stderr on every startup, and again every time `crossplay_test` is actually invoked, so it isn't easy to miss mid-session.

What the server does do to reduce (not eliminate) risk:
- **Local stdio transport only.** No network transport (WebSocket/SSE) is exposed — by design, not by omission. There's no remote-execution surface here beyond what stdio already implies.
- **Workspace-root path guard.** Every file-path input (`specPath`, `tracePath`) is resolved and checked against the directory the server was started in; a path that escapes it (via `../` traversal or an absolute path elsewhere) is rejected before anything touches the filesystem.
- **Trace files are still treated as untrusted input**, same as the CLI and viewer (ADR-003, NFR-018) — `crossplay_read_trace` never embeds screenshot bytes in its response, only asset names, and hierarchy dumps are returned as plain text.

None of this changes the core fact: if you give an agent this server, you've given it the ability to run code in this project. Decide accordingly.

## Install

```bash
npm install -D @projectcrossplay/mcp-server
```

Configure your MCP client to launch the `crossplay-mcp` binary over stdio. There's no config file — the server infers the workspace root from its own working directory, the same way the CLI does.

## Tools

### `crossplay_doctor`
Read-only. Checks Node version, config presence, Playwright browser installs, and ADB/device availability. No input.

### `crossplay_test` ⚠️
Runs the test suite. Optional `target` (a target name, comma-separated names, or `"all"`; omitted runs the first configured target) and `specPath` (a single spec file, relative to the workspace root). Returns per-target pass/fail counts and per-test name/state/errors.

### `crossplay_read_trace`
Read-only. Parses a `.trace` file (`tracePath`, relative to the workspace root) and returns the action log, per-step status/errors, and any captured DOM hierarchy dumps as text. Screenshot bytes are never embedded — only the asset name each step references.

### `crossplay_scaffold`
Creates `crossplay.config.mts` and an example spec in the current directory (optional `ci: true` also scaffolds a GitHub Actions workflow). Never overwrites a file that already exists.

## Design notes

- **Every tool calls CrossPlay's underlying functions directly** (`runDoctorChecks`, `runTarget`, `readTrace`, `scaffoldFiles`) — none of them shell out to the `crossplay` binary and scrape its stdout. That would be both fragile and, for this server specifically, actively dangerous: stdout is the MCP protocol's own transport channel, so any stray text written there (including the CLI's normal terminal output, and Vitest's own default reporter) would corrupt the JSON-RPC stream. `crossplay_test` runs Vitest with a silent reporter for exactly this reason.
- Full sizing, sequencing, and risk register: `docs/project-proposal-mcp-v0.2.md` (internal planning doc, Digital House tracking — not in this repo).
