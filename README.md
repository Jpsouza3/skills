# skills

Claude Code skills. Each folder in `skills/` is a complete, self-contained skill: `SKILL.md`, references, templates and its own README.

| Skill | What it does |
|-------|--------------|
| [spec-to-test](skills/spec-to-test/) | Feature spec → test cases → Playwright implementation plan, with human checkpoints |

## Installation

Symlink a skill for all projects (a `git pull` here updates it):

```bash
ln -s "$(pwd)/skills/<skill>" ~/.claude/skills/<skill>
```

For a single project, copy `skills/<skill>` to `<project>/.claude/skills/`.

## New skill

Create `skills/<name>/SKILL.md` (frontmatter with `name` and `description`), put whatever only some steps use in `references/`, and add the skill to the table above.
