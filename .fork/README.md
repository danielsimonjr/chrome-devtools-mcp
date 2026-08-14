# Fork-only notes

This directory is **not present upstream**, so anything documented here can never
conflict during a sync. Fork invariants belong here rather than in `CONTRIBUTING.md`
or `CHANGELOG.md` — both of those are upstream's and are rewritten by their release
tooling.

## What this fork actually changes

Verified with `git diff --name-only upstream/main...origin/main`:

| path | why |
|---|---|
| `.claude-plugin/plugin.json` | the Claude Code plugin manifest; we rewrite the launcher |
| `.fork/` | this directory — patch script and these notes |
| `.github/workflows/sync-upstream.yml` | the daily upstream sync |
| `CONTRIBUTING.md` | fork build note |
| `package-lock.json` | drifted from upstream's; see below |
| `build/**` | committed build output |

**`package.json` is byte-identical to upstream.** That single fact is what makes the
lockfile handling below safe, so re-check it before changing that logic.

## sync-upstream: generated files are taken from upstream, never merged

The merge step resolves conflicts in `plugin.json`, `package-lock.json` and `build/**`
by taking upstream's copy, then rebuilds everything with `npm ci && npm run bundle`.

**Why not merge them.** A three-way merge of a generated artifact produces a file
that neither side's generator would emit — a lockfile or a bundle that nobody has
ever built. Taking one side wholesale and regenerating is the only resolution that
yields a real artifact.

**The failure this fixed.** From at least 2026-08-11 through 2026-08-14 the job
failed *every day* with:

```
CONFLICT (content): Merge conflict in package-lock.json
##[error]unresolved conflicts outside plugin.json
```

The step's comment asserted plugin.json was "the only file that can conflict". It was
wrong, and the assertion was load-bearing: everything else was treated as fatal. Our
lockfile had drifted from upstream's while `package.json` had not, so the two
lockfiles conflicted on every upstream release.

Taking upstream's lockfile is correct *because* `package.json` matches upstream — and
`npm ci` in the next step would reject a lockfile that did not agree with it, so a
wrong resolution fails loudly rather than shipping.

**Conflicts outside that generated set still fail the job.** Those files are
hand-written, and a conflict there is a real decision that should not be guessed.

## Do not add an npm-publish step

The package name `chrome-devtools-mcp` is **owned upstream** (mathias, orkon). A
publish from this fork fails auth, and an `E404` on `PUT` reads as "missing package"
rather than "not yours", which has cost debugging time before.
