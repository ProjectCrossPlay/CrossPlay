#!/usr/bin/env node
/**
 * MCP smoke test (B-105-08): spins up the real built crossplay-mcp binary
 * and drives it with a real MCP client over actual stdio against a live
 * example project — the same "actually prove it for a fresh consumer"
 * spirit as quickstart-smoke (B-051), for the MCP surface instead of the
 * CLI/npm-package surface.
 *
 * Requires: packages/mcp-server built (dist/index.js), examples/demo-web's
 * server running on PORT (default 4173), chromium installed.
 *
 * Usage (from packages/mcp-server): node scripts/smoke.mjs
 */
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.error(`  ✖ ${msg}`);
    failures++;
  }
}

const binPath = resolve('dist/index.js');
const demoWebDir = resolve('..', '..', 'examples', 'demo-web');

console.log('--- connecting to the real binary, driven against examples/demo-web ---');
const client = new Client({ name: 'mcp-smoke', version: '0.0.0' });
const transport = new StdioClientTransport({ command: 'node', args: [binPath], cwd: demoWebDir, stderr: 'pipe' });
await client.connect(transport);

const { tools } = await client.listTools();
const expectedTools = ['crossplay_doctor', 'crossplay_test', 'crossplay_read_trace', 'crossplay_scaffold'];
assert(
  expectedTools.every((name) => tools.some((t) => t.name === name)),
  `all ${expectedTools.length} tools are listed`,
);

const doctor = await client.callTool({ name: 'crossplay_doctor', arguments: {} });
assert(!doctor.isError, 'crossplay_doctor succeeds');
const doctorResult = JSON.parse(doctor.content[0].text);
assert(Array.isArray(doctorResult.checks) && doctorResult.checks.length > 0, 'crossplay_doctor returns real checks');

console.log('--- running a real test target via crossplay_test ---');
const testResult = await client.callTool({ name: 'crossplay_test', arguments: { target: 'chromium' } });
const parsedTest = JSON.parse(testResult.content[0].text);
assert(
  !testResult.isError && parsedTest.passed > 0 && parsedTest.failed === 0,
  `crossplay_test runs the real suite: ${parsedTest.passed} passed, ${parsedTest.failed} failed`,
);

console.log('--- reading back the trace that run just produced ---');
const traceDir = join(demoWebDir, '.crossplay', 'traces');
const latestTrace = (await readdir(traceDir)).filter((f) => f.endsWith('.trace')).sort().at(-1);
assert(Boolean(latestTrace), 'crossplay_test produced a trace file');

const traceResult = await client.callTool({
  name: 'crossplay_read_trace',
  arguments: { tracePath: `.crossplay/traces/${latestTrace}` },
});
const parsedTrace = JSON.parse(traceResult.content[0].text);
assert(
  !traceResult.isError && parsedTrace.manifest.result === 'passed' && parsedTrace.steps.length > 0,
  'crossplay_read_trace reads the real trace: passed manifest, real steps',
);

console.log('--- workspace-root guard rejects a real traversal attempt ---');
const guardResult = await client.callTool({
  name: 'crossplay_read_trace',
  arguments: { tracePath: '../../../etc/passwd' },
});
assert(guardResult.isError === true, 'traversal outside the workspace root is rejected');

await client.close();

console.log('--- crossplay_scaffold in a throwaway directory (does not touch demo-web) ---');
const scratchDir = await mkdtemp(join(tmpdir(), 'mcp-smoke-scaffold-'));
try {
  const scaffoldClient = new Client({ name: 'mcp-smoke-scaffold', version: '0.0.0' });
  const scaffoldTransport = new StdioClientTransport({ command: 'node', args: [binPath], cwd: scratchDir });
  await scaffoldClient.connect(scaffoldTransport);
  const scaffoldResult = await scaffoldClient.callTool({ name: 'crossplay_scaffold', arguments: {} });
  const parsedScaffold = JSON.parse(scaffoldResult.content[0].text);
  assert(
    !scaffoldResult.isError && parsedScaffold.some((r) => r.path === 'crossplay.config.mts' && r.action === 'created'),
    'crossplay_scaffold creates a real config file in a fresh directory',
  );
  await scaffoldClient.close();
} finally {
  await rm(scratchDir, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n${failures} smoke check(s) failed.`);
  process.exit(1);
}
console.log('\nAll MCP smoke checks passed.');
