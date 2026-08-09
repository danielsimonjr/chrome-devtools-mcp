// Regenerate this fork's ONLY source-level divergence from upstream:
// .claude-plugin/plugin.json, so the MCP server launches via `node` against the
// committed build/ instead of `npx`.
//
// Why: upstream launches with `npx chrome-devtools-mcp@<ver>`. npx re-resolves the
// spec against the registry on EVERY spawn — measured at 9.3s of pure overhead on
// the user's box, pushing total startup to ~20s and intermittently past Claude Code's
// hard 30s MCP handshake budget. Launching the committed build directly: ~4s.
//
// Keeping the patch in a SCRIPT (not a hand-edited file) is what makes the upstream
// sync mechanical: after merging a new upstream tag, plugin.json is simply
// regenerated, so a conflict in it is never something a human has to resolve.
import { readFileSync, writeFileSync } from 'node:fs';

const PLUGIN_JSON = '.claude-plugin/plugin.json';
const ENTRY = '${CLAUDE_PLUGIN_ROOT}/build/src/bin/chrome-devtools-mcp.js';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const plugin = JSON.parse(readFileSync(PLUGIN_JSON, 'utf8'));

plugin.version = version;
plugin.mcpServers = {
  'chrome-devtools': {
    command: 'node',
    args: [ENTRY],
    // Claude Code caches MCP start-failures keyed on the config hash and then
    // silently skips the server on later reloads. Changing this value on every
    // version bump guarantees a fresh hash -> cache miss -> real spawn attempt.
    env: { _RETRY: `fork-node-launcher-${version}` },
  },
};

writeFileSync(PLUGIN_JSON, JSON.stringify(plugin, null, 2) + '\n');
console.log(`patched ${PLUGIN_JSON}: node launcher, version ${version}`);
