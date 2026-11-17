# skills

Skills do Claude Code. Cada pasta em `skills/` é uma skill completa e independente: `SKILL.md`, referências, templates e o README dela.

| Skill | O que faz |
|-------|-----------|
| [spec-to-test](skills/spec-to-test/) | Spec de feature → casos de teste → plano de implementação Playwright, com checkpoints humanos |

## Instalação

Symlink de uma skill para todos os projetos (um `git pull` aqui atualiza):

```bash
ln -s "$(pwd)/skills/<skill>" ~/.claude/skills/<skill>
```

Para um projeto só, copie `skills/<skill>` para `<projeto>/.claude/skills/`.

## Nova skill

Crie `skills/<nome>/SKILL.md` (frontmatter com `name` e `description`), coloque o que só alguns passos usam em `references/` e acrescente a skill na tabela acima.
