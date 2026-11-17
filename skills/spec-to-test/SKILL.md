---
name: spec-to-test
description: Traduz a spec de uma feature (lida via gh do GitHub, ou de um arquivo local) em casos de teste e depois num plano de implementação Playwright de acordo com o ARCHITECTURE.md do testware, com checkpoint humano entre as fases. Use quando pedirem para gerar, planejar ou atualizar testes a partir de uma spec.
argument-hint: <url github tree|blob> | <owner>/<repo> <path>[@ref] | <caminho/local.md>  [--update]  [--only-cases]
hooks:
  PreToolUse:
    - matcher: "Read|Grep|Glob|Bash|Write|Edit"
      hooks:
        - type: command
          # ${CLAUDE_SKILL_DIR} não chega aos comandos de hook: procura a skill onde ela pode estar instalada.
          command: 'for d in "${CLAUDE_PLUGIN_ROOT}/skills/spec-to-test" "${CLAUDE_PROJECT_DIR}/.claude/skills/spec-to-test" "$HOME/.claude/skills/spec-to-test"; do [ -f "$d/scripts/budget-hook.mjs" ] && exec node "$d/scripts/budget-hook.mjs"; done; echo "spec-to-test: scripts/budget-hook.mjs não encontrado" >&2; exit 1'
---

# spec-to-test

Um único contexto, sem subagentes, com duas fases e um checkpoint humano depois de cada uma:

```text
spec ──► 01-test-cases.md ──⏸ checkpoint 1──► 02-plan.md ──⏸ checkpoint 2──► fim
```

A skill termina no plano. A implementação é feita depois, numa sessão nova, a partir do `02-plan.md` (veja "Encerramento").

Argumentos: `$ARGUMENTS`

## 0. Preparação

1. **Testware.** O diretório atual precisa ser a raiz de um testware Playwright (`playwright.config.*`). Se não for, pare e peça o caminho. Anote se existe `ARCHITECTURE.md` na raiz (só `ls`; o conteúdo é lido na fase 2).
2. **Spec.** Interprete a referência dos argumentos. Sem argumentos, pergunte qual spec usar. Leia [`references/reading-specs.md`](references/reading-specs.md) **antes** de qualquer chamada ao `gh`: ele tem a checagem do token e as únicas formas de chamada permitidas.
3. **Modo indicado.** `--update`, ou frases como "a spec mudou", "change request", indicam `atualização`; senão, `criação`. É só uma pista: a fase 2 confirma o modo comparando com os testes existentes. Guarde **literalmente** qualquer texto do usuário que descreva a mudança.
4. **Diretório de trabalho.** `<slug>` = último segmento do caminho da spec, em kebab-case, sem acentos e sem `.md`. Os arquivos ficam em `.test-generation/<slug>/`.
   - `.test-generation/` fica **fora do git** por conta própria: ao criar a pasta, grave `.test-generation/.gitignore` com o conteúdo `*`. Isso ignora a pasta inteira sem alterar nenhum arquivo versionado.
   - Se `.test-generation/<slug>/` já existir, pergunte se é para retomar (e de qual fase) ou recomeçar. Um diretório de uma versão anterior da spec é renomeado com o sufixo da versão (`<slug>@1.0.0`), nunca apagado.

**Pronto quando:** a spec está lida, o modo indicado e o diretório estão definidos.

## Fase 1 — Spec → casos de teste

Leia [`references/translation.md`](references/translation.md) e siga as regras dele. Nesta fase, a única fonte é a **spec**: os casos devem refletir o que a spec exige, não o que o testware já cobre. Os arquivos do testware só são abertos na fase 2.

Grave `.test-generation/<slug>/01-test-cases.md` no formato do `translation.md`.

**Pronto quando:** cada caminho, bloco condicional, regra de validação e efeito colateral da spec aparece em algum caso (como caso ou como asserção), e toda ambiguidade está em "Questões em aberto".

### ⏸ Checkpoint 1

Mostre ao usuário a tabela de resumo, as questões em aberto e, no modo atualização, os casos marcados como afetados pela última versão. Pergunte se aprova, se quer remover ou mudar casos, ou se vai editar o arquivo. Sem `ARCHITECTURE.md`, pergunte na mesma mensagem se a fase 2 pode começar gerando o rascunho dele (passo 1 do `planning.md`).

**Só avance com aprovação explícita.** Se houver ajustes, edite o `01-test-cases.md`, mostre o que mudou e pergunte de novo. Com `--only-cases`, a skill termina aqui.

## Fase 2 — Casos → plano de implementação

Leia [`references/planning.md`](references/planning.md) e siga o processo dele. A fonte de verdade agora é o `01-test-cases.md` aprovado (se o usuário o editou, releia-o) mais o `ARCHITECTURE.md` do testware. A spec original não é mais consultada.

Grave `.test-generation/<slug>/02-plan.md` no formato do `planning.md`.

**Pronto quando:** todo caso aprovado está no plano (a criar, a alterar, coberto ou fora do escopo), e cada item a reusar ou alterar cita `arquivo:linha`.

### ⏸ Checkpoint 2

Mostre ao usuário:
- o modo confirmado (e o motivo, se divergir do indicado)
- a reconciliação: quantos casos `coberto`/`divergente`/`parcial`/`novo`, com a tabela dos que não estão `coberto`
- os testes órfãos, cada um com a recomendação
- os arquivos a criar e alterar, as specs impactadas, as variáveis de ambiente novas
- as pendências que exigem decisão

Peça uma decisão para **cada teste órfão** (remover, ajustar ou manter; sem resposta, fica mantido) e para cada pendência. Registre tudo no fim do `02-plan.md`, em `## Decisões`.

## Encerramento

Responda com o caminho dos dois arquivos e o prompt para implementar numa sessão nova:

```text
Implemente .test-generation/<slug>/02-plan.md seguindo o ARCHITECTURE.md.
Ao final, rode o typecheck e `npx playwright test <spec> --list`, e pergunte antes de executar os testes.
```

Commits, PRs e escrita via `gh` ficam com o usuário.
