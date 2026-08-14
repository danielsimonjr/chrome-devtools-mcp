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

## `gh` in a fork resolves against the PARENT — always pass `--repo`

This is a real GitHub fork (`isFork: true`, parent `ChromeDevTools/chrome-devtools-mcp`),
and a bare `gh pr create` / `gh pr list` targets the **parent**. Two bugs came from it:

- `gh pr create` tried to open the sync PR against ChromeDevTools and failed with
  `GraphQL: Resource not accessible by integration (createPullRequest)`. That message
  names the *permission* and never the *repo it was denied on*, so it reads as a missing
  `pull-requests: write` — which the workflow already had. The theory that survived
  longest was the account-level "Allow GitHub Actions to create and approve pull
  requests" toggle; it was disproved by observing that `github-actions[bot]` had opened
  PRs in other repos of this account the same day.
- `gh pr list --head` was listing the parent's PRs, so it always returned zero. The
  "a PR is already open, leave the branch alone" guard therefore never fired, and the
  next run would have deleted a sync branch out from under its own open PR.

`gh pr create` also needs an explicit `--base`, because gh's default base is the
parent's default branch.

## The rebuild commit must `git rm --cached` build/ first

`find build -type f | xargs git add` enumerates files that **exist**, so it can never
stage a deletion. A file upstream removes stays committed forever and `build/` only
grows — eventually shipping dead modules, and a renamed entry point would leave the old
one in place.

Measured on the 1.6.0 → 1.7.0 sync: **858 additions, 267 modifications, 0 deletions.**
Zero deletions across a whole upstream minor bump is the tell. The only visible symptom
was `Warning: 35 uncommitted changes` in an unrelated later step.

`git rm -r --cached -- build` before the re-add makes the index match the filtered file
list exactly. `--cached` leaves the worktree alone, so the `find` immediately after
picks everything back up.

## Do not add an npm-publish step

The package name `chrome-devtools-mcp` is **owned upstream** (mathias, orkon). A
publish from this fork fails auth, and an `E404` on `PUT` reads as "missing package"
rather than "not yours", which has cost debugging time before.
