---
name: spec-to-test
description: Translates a feature spec (read via gh from GitHub, or from a local file) into test cases and then into a Playwright implementation plan that follows the testware's ARCHITECTURE.md, with a human checkpoint between phases. Use when asked to generate, plan or update tests from a spec.
argument-hint: <github tree|blob url> | <owner>/<repo> <path>[@ref] | <local/path.md>  [--update]  [--only-cases]
hooks:
  PreToolUse:
    - matcher: "Read|Grep|Glob|Bash|Write|Edit"
      hooks:
        - type: command
          # ${CLAUDE_SKILL_DIR} doesn't reach hook commands: look for the skill wherever it may be installed.
          command: 'for d in "${CLAUDE_PLUGIN_ROOT}/skills/spec-to-test" "${CLAUDE_PROJECT_DIR}/.claude/skills/spec-to-test" "$HOME/.claude/skills/spec-to-test"; do [ -f "$d/scripts/budget-hook.mjs" ] && exec node "$d/scripts/budget-hook.mjs"; done; echo "spec-to-test: scripts/budget-hook.mjs not found" >&2; exit 1'
---

# spec-to-test

A single context, no subagents, with two phases and a human checkpoint after each:

```text
spec ──► 01-test-cases.md ──⏸ checkpoint 1──► 02-plan.md ──⏸ checkpoint 2──► done
```

The skill ends at the plan. Implementation happens later, in a new session, from `02-plan.md` (see "Wrap-up").

Arguments: `$ARGUMENTS`

## 0. Setup

1. **Testware.** The current directory must be the root of a Playwright testware (`playwright.config.*`). If it isn't, stop and ask for the path. Note whether `ARCHITECTURE.md` exists at the root (just `ls`; its content is read in phase 2).
2. **Spec.** Interpret the reference in the arguments. With no arguments, ask which spec to use. Read [`references/reading-specs.md`](references/reading-specs.md) **before** any `gh` call: it has the token check and the only allowed call forms.
3. **Indicated mode.** `--update`, or phrases like "the spec changed", "change request", indicate `update`; otherwise, `create`. It's only a hint: phase 2 confirms the mode by comparing against existing tests. Keep **verbatim** any user text describing the change.
4. **Working directory.** `<slug>` = last segment of the spec path, in kebab-case, without accents and without `.md`. Files go in `.test-generation/<slug>/`.
   - `.test-generation/` stays **out of git** on its own: when creating the folder, write `.test-generation/.gitignore` with the content `*`. This ignores the whole folder without changing any versioned file.
   - If `.test-generation/<slug>/` already exists, ask whether to resume (and from which phase) or start over. A directory from a previous spec version is renamed with the version suffix (`<slug>@1.0.0`), never deleted.

**Done when:** the spec is read and the indicated mode and directory are defined.

## Phase 1 — Spec → test cases

Read [`references/translation.md`](references/translation.md) and follow its rules. In this phase, the only source is the **spec**: cases must reflect what the spec requires, not what the testware already covers. Testware files are only opened in phase 2.

Write `.test-generation/<slug>/01-test-cases.md` in the format from `translation.md`.

**Done when:** every path, conditional block, validation rule and side effect in the spec appears in some case (as a case or as an assertion), and every ambiguity is in "Open questions".

### ⏸ Checkpoint 1

Show the user the summary table, the open questions and, in update mode, the cases marked as affected by the latest version. Ask whether they approve, want to remove or change cases, or will edit the file. Without `ARCHITECTURE.md`, ask in the same message whether phase 2 may start by generating its draft (step 1 of `planning.md`).

**Only move on with explicit approval.** If there are adjustments, edit `01-test-cases.md`, show what changed and ask again. With `--only-cases`, the skill ends here.

## Phase 2 — Cases → implementation plan

Read [`references/planning.md`](references/planning.md) and follow its process. The source of truth is now the approved `01-test-cases.md` (if the user edited it, re-read it) plus the testware's `ARCHITECTURE.md`. The original spec is no longer consulted.

Write `.test-generation/<slug>/02-plan.md` in the format from `planning.md`.

**Done when:** every approved case is in the plan (to create, to change, covered or out of scope), and every item to reuse or change cites `file:line`.

### ⏸ Checkpoint 2

Show the user:
- the confirmed mode (and the reason, if it differs from the indicated one)
- the reconciliation: how many cases are `covered`/`divergent`/`partial`/`new`, with the table of those that aren't `covered`
- the orphan tests, each with its recommendation
- the files to create and change, the impacted specs, the new environment variables
- the open items that require a decision

Ask for a decision on **each orphan test** (remove, adjust or keep; with no answer, it is kept) and on each open item. Record everything at the end of `02-plan.md`, under `## Decisions`.

## Wrap-up

Reply with the paths of both files and the prompt to implement in a new session:

```text
Implement .test-generation/<slug>/02-plan.md following ARCHITECTURE.md.
When done, run the typecheck and `npx playwright test <spec> --list`, and ask before running the tests.
```

Commits, PRs and writes via `gh` are left to the user.
