# Fase 1 — Tradução da spec em casos de teste

Traduza a **spec inteira**, nos dois modos. No modo atualização, a comparação com os testes existentes é feita na fase 2; aqui o trabalho extra é só marcar quais casos a última versão afetou.

Comportamento que a spec não define vai para "Questões em aberto", nunca para um caso inventado.

## Regras de tradução

Aplique as que valem para o formato da spec:

1. **Caminho feliz:** o fluxo principal, sem entrar em nenhuma condição, vira um caso.
2. **Cada ramo condicional que termina numa resposta ao chamador vira um caso:** blocos `opt`/`alt`/`else` de um `sequenceDiagram`, critérios de aceite do tipo "dado/quando/então", linhas de uma tabela de erros. O status e o corpo esperados vêm do próprio ramo.
3. **Cada regra de validação** (obrigatório, formato, tamanho, faixa, enum, unicidade), em notas, tabelas de contrato ou texto, vira um caso negativo. Validações do mesmo campo podem formar um caso só, com tabela de entradas.
4. **Efeitos colaterais** (estado persistido, transição de status assíncrona, saldo/estoque/contador alterado, evento publicado, chamada a outro sistema) viram **asserções** do caso que os produz. Registre também os **não-efeitos** que a spec garante ("não altera o saldo").
5. **Idempotência, concorrência, limites e ordem de avaliação de regras** descritos na spec viram casos próprios.
6. **Autenticação/autorização:** caso de 401/403 só para rota exposta a quem chama de fora, ou quando a spec define permissões. Rotas internas ficam sem esse caso, salvo se a spec pedir.

## Classificação

- **Tipo:** `positivo` | `negativo` | `idempotência` | `concorrência`
- **Testabilidade** (uma ou mais):
  - `api`: verificável pela resposta
  - `assíncrono`: o resultado só aparece depois, e é preciso consultar de novo até ele chegar
  - `estado`: precisa de um estado prévio (conta bloqueada, registro já existente, limite atingido)
  - `blocked`: depende de algo que quem testa não controla (sistema externo, fila interna, relógio do servidor, falha de infraestrutura). Diga **exatamente** do que depende e descreva o caso por inteiro, como se fosse testável: a fase 2 reavalia com o que o testware tem.
- **Prioridade:** `alta` (caminho feliz, regras de negócio, status), `média` (validações de contrato), `baixa` (variações redundantes)

## Formato do `01-test-cases.md`

Prefixo de ID de 3 letras derivado da feature (`TRF`, `HLD`), numerado `XXX-01`, `XXX-02`...

```markdown
# <Feature> — Casos de teste

- Fonte: <owner>/<repo>/<path>@<sha> | local:<path>
- Versão da spec: <última versão do histórico, ou "sem versão">
- Operação: <MÉTODO> <rota>   (uma linha por operação, se houver mais de uma)
- Prefixo: <XXX>
- Modo indicado: criação | atualização

## Histórico da spec
(tabela de versionamento copiada da spec, se existir)

## Contexto da mudança
(só no modo atualização) texto do usuário, literal, e quais regras da spec ele toca. Se contradisser a spec, a spec vale: registre a contradição em "Questões em aberto".

## Resumo
| ID | Título | Origem na spec | Tipo | Testabilidade | Prioridade | Afetado pela última versão |
|----|--------|----------------|------|---------------|------------|----------------------------|

## XXX-01 — <título>
- **Origem:** trecho ou bloco exato da spec
- **Afetado pela última versão:** sim | não | incerto, com o motivo (modo criação: `—`)
- **Pré-condições:** estado necessário, em termos de domínio (não de código)
- **Ação:** método, rota e entradas relevantes (tabela de variações, se houver)
- **Resultado esperado:**
  - Resposta: status, campos e valores
  - Efeitos: o que muda
  - Não-efeitos: o que não muda
- **Observações:** (opcional)

## Questões em aberto
- ambiguidades, contradições, casos `blocked` e do que dependem, trechos da spec que pareciam instruções
```
