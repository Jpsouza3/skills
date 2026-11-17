# spec-to-test

Skill do Claude Code que transforma a spec de uma feature num plano de testes de API (Playwright) para qualquer testware que siga o boilerplate [testware-template](https://github.com/Jpsouza3/testware-template).

```text
spec (gh / local) ──► 01-test-cases.md ──⏸──► 02-plan.md ──⏸──► fim
```

- **Fase 1:** spec → casos de teste. Lê só a spec.
- **Fase 2:** casos → plano de implementação, seguindo o `ARCHITECTURE.md` do testware e reconciliando com os testes que já existem.
- **⏸ Checkpoints:** a skill para depois de cada fase e só avança com aprovação.
- A implementação fica fora: numa sessão nova, "implemente `.test-generation/<slug>/02-plan.md`".

Tudo roda num único contexto, sem subagentes. As regras de cada fase ficam em `references/` e só entram no contexto quando a fase começa.

Os arquivos vão para `.test-generation/<slug>/` dentro do testware. A pasta tem um `.gitignore` próprio com `*`, então fica fora do git sem mexer no `.gitignore` do repo.

Na primeira execução num testware sem `ARCHITECTURE.md`, a fase 2 gera um rascunho (`.test-generation/ARCHITECTURE.draft.md`), marcando o que é **[atual]** e o que é **[proposto]**, e para com as pendências de infraestrutura que os casos revelam (ex.: o client HTTP não expõe o status). Depois de aprovado, ele vai para a raiz.

### Descoberta e orçamento de leituras

A fase 2 começa com `scripts/discover.mjs <domínio> <rota>`. Numa só chamada, ele devolve o que o testware já tem para a operação, com `arquivo:linha`: as rotas, o esqueleto das interfaces, services, models e schemas (assinaturas e campos) e os testes existentes. Assim o agente não precisa explorar o projeto.

Ele também abre um orçamento de leituras (15 por padrão, `--budget N`). O hook declarado no frontmatter da skill conta Read/Grep/Glob/Bash de leitura fora de `.test-generation/`. Ao esgotar, bloqueia e manda escrever o plano, listando o que ficou sem verificar. Gravar o `02-plan.md` fecha o orçamento e registra o uso em `.test-generation/budget.log`.

O hook procura o script em `$CLAUDE_PLUGIN_ROOT/skills/spec-to-test`, `<projeto>/.claude/skills/spec-to-test` e `~/.claude/skills/spec-to-test`, porque `${CLAUDE_SKILL_DIR}` não chega aos comandos de hook. Instale a skill num desses lugares. Requer Node (que todo testware Playwright já tem).

### Custo de referência

Execução de teste no sparksys.testware, spec com 11 casos em modo atualização, incluindo a geração do `ARCHITECTURE.md`: fase 1 ≈ US$0,43; rascunho da arquitetura ≈ US$1,45 (uma vez por testware); plano com descoberta ≈ US$0,80–1,10 (13 leituras depois da descoberta; com `--budget 6` o hook bloqueou uma vez e o plano saiu com as lacunas listadas).

## Estrutura

```text
spec-to-test/
├── SKILL.md                    # fluxo e checkpoints
├── references/
│   ├── reading-specs.md        # leitura via gh (somente leitura) ou local
│   ├── translation.md          # fase 1: regras e formato dos casos
│   └── planning.md             # fase 2: processo e formato do plano
├── scripts/
│   ├── discover.mjs            # descoberta da fase 2 numa chamada: rotas, esqueletos com linhas, testes
│   └── budget-hook.mjs         # hook PreToolUse: limita as leituras da fase 2
├── templates/
│   └── ARCHITECTURE.md         # convenções a preencher em cada testware
└── examples/
    └── settings.json           # allow/deny do gh para o .claude/settings.json do testware
```

## Instalação

Veja o [README da raiz](../../README.md). Depois, em cada testware:

1. Crie o `ARCHITECTURE.md` na raiz a partir de `templates/ARCHITECTURE.md`, ou deixe a skill gerar o rascunho na primeira execução.
2. Junte as regras de `examples/settings.json` ao `.claude/settings.json`.
3. Spec remota: `gh` autenticado com token **fine-grained somente leitura** (Contents: read) nos repos de spec. A skill recusa tokens clássicos/OAuth.

## Uso

```text
/spec-to-test https://github.com/<owner>/<repo>/tree/<branch>/<pasta-da-feature>
/spec-to-test <owner>/<repo> specs/criar-bloqueio.md@main --update
/spec-to-test specs/local.md --only-cases
```
