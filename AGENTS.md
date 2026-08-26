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

### Page-ID routing is ON, which is upstream's default

Upstream 1.8.0 routes page-scoped tools by an explicit `pageId`, and makes that
parameter required. A tool now acts on `getPageById(pageId)` instead of on
`getSelectedMcpPage()`.

Keep this default. The old behaviour reads an implicit "currently selected page",
which is shared state. When two agent sessions drive one browser, a `select_page`
in one session silently changes the target of a `click` in the other. Explicit
routing removes that failure.

A caller that omits `pageId` gets `-32602 Input validation error`. This costs
nothing in practice, because callers read the schema at connect time. Only a
session that already holds the 1.7.0 schema is affected, and a restart clears it.

`--no-page-id-routing` restores the 1.7.0 contract. Use it only to bridge a
running session. One difference has no flag: `upload_file` replaced `filePath`
with `filePaths`.
