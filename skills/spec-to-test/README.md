# spec-to-test

Claude Code skill that turns a feature spec into an API test plan (Playwright) for any testware that follows the [testware-template](https://github.com/Jpsouza3/testware-template) boilerplate.

```text
spec (gh / local) ──► 01-test-cases.md ──⏸──► 02-plan.md ──⏸──► done
```

- **Phase 1:** spec → test cases. Reads only the spec.
- **Phase 2:** cases → implementation plan, following the testware's `ARCHITECTURE.md` and reconciling with the tests that already exist.
- **⏸ Checkpoints:** the skill stops after each phase and only moves on with approval.
- Implementation is out of scope: in a new session, "implement `.test-generation/<slug>/02-plan.md`".

Everything runs in a single context, with no subagents. Each phase's rules live in `references/` and only enter the context when the phase starts.

Files go to `.test-generation/<slug>/` inside the testware. The folder has its own `.gitignore` containing `*`, so it stays out of git without touching the repo's `.gitignore`.

On the first run in a testware without `ARCHITECTURE.md`, phase 2 generates a draft (`.test-generation/ARCHITECTURE.draft.md`), marking what is **[current]** and what is **[proposed]**, and stops with the infrastructure gaps the cases reveal (e.g. the HTTP client does not expose the status). Once approved, it moves to the root.

### Discovery and read budget

Phase 2 starts with `scripts/discover.mjs <domain> <route>`. In a single call, it returns what the testware already has for the operation, with `file:line`: the routes, the skeleton of interfaces, services, models and schemas (signatures and fields) and the existing tests. That way the agent doesn't need to explore the project.

It also opens a read budget (15 by default, `--budget N`). The hook declared in the skill's frontmatter counts Read/Grep/Glob/read-only Bash outside `.test-generation/`. When the budget runs out, it blocks and tells the agent to write the plan, listing what was left unverified. Writing `02-plan.md` closes the budget and logs usage to `.test-generation/budget.log`.

The hook looks for the script in `$CLAUDE_PLUGIN_ROOT/skills/spec-to-test`, `<project>/.claude/skills/spec-to-test` and `~/.claude/skills/spec-to-test`, because `${CLAUDE_SKILL_DIR}` doesn't reach hook commands. Install the skill in one of these places. Requires Node (which every Playwright testware already has).

### Reference cost

Test run on sparksys.testware, spec with 11 cases in update mode, including generating `ARCHITECTURE.md`: phase 1 ≈ US$0.43; architecture draft ≈ US$1.45 (once per testware); plan with discovery ≈ US$0.80–1.10 (13 reads after discovery; with `--budget 6` the hook blocked once and the plan came out with the gaps listed).

## Structure

```text
spec-to-test/
├── SKILL.md                    # flow and checkpoints
├── references/
│   ├── reading-specs.md        # reading via gh (read-only) or local
│   ├── translation.md          # phase 1: rules and case format
│   └── planning.md             # phase 2: process and plan format
├── scripts/
│   ├── discover.mjs            # phase 2 discovery in one call: routes, skeletons with lines, tests
│   └── budget-hook.mjs         # PreToolUse hook: limits phase 2 reads
├── templates/
│   └── ARCHITECTURE.md         # conventions to fill in for each testware
└── examples/
    └── settings.json           # gh allow/deny rules for the testware's .claude/settings.json
```

## Installation

See the [root README](../../README.md). Then, in each testware:

1. Create `ARCHITECTURE.md` at the root from `templates/ARCHITECTURE.md`, or let the skill generate the draft on the first run.
2. Merge the rules from `examples/settings.json` into `.claude/settings.json`.
3. Remote spec: `gh` authenticated with a **read-only fine-grained** token (Contents: read) on the spec repos. The skill refuses classic/OAuth tokens.

## Usage

```text
/spec-to-test https://github.com/<owner>/<repo>/tree/<branch>/<feature-folder>
/spec-to-test <owner>/<repo> specs/create-hold.md@main --update
/spec-to-test specs/local.md --only-cases
```
