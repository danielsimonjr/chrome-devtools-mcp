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

### `|| true` on the build/ grep is required, not defensive

The step runs under `set -euo pipefail` **and** `bash -e`. `grep` exits **1** when it
matches nothing, and matching nothing is the *normal* case for `build/` — it usually
does not conflict. Without `|| true` the shell dies at that grep, before resolving
anything.

The symptom is deceptive: the log shows the merge conflicts and then a bare
`Process completed with exit code 1`, with **none** of the step's own error text. That
reads as "the resolution logic did not run". It did not — grep killed the shell first.
The first attempt at this fix shipped with exactly that bug.

## sync-upstream: upstream's workflows are dropped, ours are kept

The merge step restores `.github/workflows/` from the pre-merge commit, so the sync
branch never carries a change to any workflow file.

**This is a hard platform limit, not a configuration mistake.** `GITHUB_TOKEN` cannot
push under `.github/workflows/` — that requires the `workflows` GitHub App permission,
and `workflows` is **not** in the vocabulary a workflow's `permissions:` block can
request. No amount of `contents: write` helps. Only a PAT could, and this job should
not hold one.

The rejection names a *file*, which makes it read as a merge problem:

```
! [remote rejected] sync/1.7.0 -> sync/1.7.0 (refusing to allow a GitHub App to
  create or update workflow `.github/workflows/pre-release.yml` without
  `workflows` permission)
```

Dropping them is right on the merits too. Upstream's workflows are release automation
for a package name this fork does not own and must never publish (below). The only
workflow this fork needs is `sync-upstream.yml` itself.

The `git rm` before the restore is load-bearing: `git checkout BASE -- .github/workflows`
restores our files but leaves any workflow upstream *added*, which is enough to trigger
the same rejection.

## Do not add an npm-publish step

The package name `chrome-devtools-mcp` is **owned upstream** (mathias, orkon). A
publish from this fork fails auth, and an `E404` on `PUT` reads as "missing package"
rather than "not yours", which has cost debugging time before.
