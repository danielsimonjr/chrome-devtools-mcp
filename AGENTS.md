This repository contains an MCP server and CLI for Chrome DevTools.

# Instructions

- Use only scripts from `package.json` to run commands.
- Use `npm run build` to run tsc and test build.
- Use `npm run test` to build and run tests, run all tests to verify correctness.
- Use `npm run test path-to-test.ts` to build and run a single test file, for example, `npm run test tests/McpContext.test.ts`.
- Use `npm run format` to fix formatting and get linting errors.
- Never modify `third_party/devtools-frontend` except for experimentation: it is a git submodule, a mirror of the actual codebase.

## Rules for TypeScript

- Do not use `any` type.
- Do not use `as` keyword for type casting.
- Do not use `!` operator for type assertion.
- Do not use `// @ts-ignore` comments.
- Do not use `// @ts-nocheck` comments.
- Do not use `// @ts-expect-error` comments.
- Prefer `for..of` instead of `forEach`.

## Fork notes

This fork tracks upstream and adds the plugin manifests under `.claude-plugin/`,
`.cursor-plugin/` and `.github/plugin/`. The sync workflow merges upstream tags
into a `sync/<version>` branch. Keep fork changes out of `CHANGELOG.md`, because
release-please generates that file upstream and a fork entry conflicts on every
sync.

### The launcher pins `--no-page-id-routing`

Upstream 1.8.0 made `pageId` a REQUIRED parameter on page-scoped tools, and the
default is on. This changed the required parameters of **25 of 29 tools** between
1.7.0 and 1.8.0. An existing caller that omits `pageId` fails.

`.claude-plugin/plugin.json` therefore launches the server with
`--no-page-id-routing`. This flag restores the 1.7.0 contract. One difference
remains, and no flag controls it: `upload_file` replaced `filePath` with
`filePaths`.

Remove the flag to adopt per-page routing. Routing by page ID helps when several
agent sessions share one browser. Remove it deliberately, because the removal
changes the contract of 24 tools at once.
