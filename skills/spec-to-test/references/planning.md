# Fase 2 — Plano de implementação

Quem implementa vai ler **só o plano** e o `ARCHITECTURE.md`. Tudo que ele precisa saber do repo entra no plano, com `arquivo:linha`.

Nesta fase, o código do testware é só lido: o único arquivo escrito é o `02-plan.md` (e o `ARCHITECTURE.md`, no caso do passo 1). Valores de `.env*` nunca são lidos; liste só as chaves:

```bash
for f in .env*; do echo "$f"; grep -oE '^[A-Za-z0-9_]+=' "$f" | sort -u; done
```

## Como buscar

Monte o plano **lendo o mínimo**. A descoberta (passo 2) já entrega o mapa com linhas; cada leitura depois dela responde a uma pergunta que o plano precisa citar.

1. **Grep dirigido** (`grep -rn`) só para o que a descoberta não respondeu.
2. **Read por faixa** (`offset`/`limit`, até ~150 linhas) em volta do que a descoberta ou o grep apontou. Cite `arquivo:linha` com o número que eles já deram.
3. **Leitura inteira** só das specs de teste da operação (passo 3) e de uma spec de referência (passo 5).
4. **Orçamento:** a descoberta abre um orçamento de 15 leituras (Read, Grep, Glob e Bash de leitura fora de `.test-generation/`), garantido pelo hook da skill. Gravar o `02-plan.md` fecha o orçamento. Ao esgotar, as leituras são bloqueadas: escreva o plano com o que tem e liste em "Riscos e pendências" o que ficou sem verificar. Para um testware grande, aumente com `--budget N`.

## Processo

### 1. Convenções

Leia o `ARCHITECTURE.md` da raiz do testware. Ele define as camadas (onde ficam tipos, schemas, interfaces, services, config, fixtures, helpers e specs), nomes, padrões de espera e proibições. O plano segue o `ARCHITECTURE.md`; onde o código existente divergir dele, siga o documento e anote a divergência em "Riscos e pendências".

**Sem `ARCHITECTURE.md`** (e com o rascunho autorizado no checkpoint 1), monte um rascunho. Isso é feito uma vez por testware, e as leituras não contam no orçamento:

1. Preencha [`../templates/ARCHITECTURE.md`](../templates/ARCHITECTURE.md) com o que o repo mostra: `ls` das pastas de topo, `playwright.config.*`, `package.json`, a config, o client HTTP, 1 service com sua interface, 1 model, 1 schema, a fixture base e 1 spec.
2. Marque cada regra como **[atual]** (o código já faz) ou **[proposto]** (convenção nova que os casos exigem, ex.: ID no título). Divergências do código com a regra entram com `arquivo:linha`.
3. Confronte os casos aprovados com a infraestrutura: o que eles precisam verificar e o testware não consegue (status HTTP não exposto pelo client, chamada sem token, falta de typecheck) vira uma pendência com opções e uma recomendação, no fim do rascunho.
4. Grave em `.test-generation/ARCHITECTURE.draft.md` e **pare**: mostre o resumo e as pendências e peça as decisões.
5. Com a aprovação, grave o `ARCHITECTURE.md` final na raiz (sem a seção de pendências) e siga para o passo 2. Decisões que exigem mudar a infraestrutura entram no plano como a camada **0. Pré-requisitos**.

### 2. Descoberta

Rode, com o domínio e a rota do `01-test-cases.md` (e as peças de infraestrutura que o `ARCHITECTURE.md` cita, em `--also`):

```bash
node "<diretório base da skill, informado quando ela foi carregada>/scripts/discover.mjs" <domínio> <trecho-da-rota> [--also <arquivo>]... [--budget N]
# ex.: node .../discover.mjs job /api/Job --also core/HttpClient.ts --also tests/baseTest.ts
```

A saída lista, com `arquivo:linha`: as rotas no código de produção, o esqueleto (exports, métodos com assinatura, campos de tipos) de cada arquivo que menciona os termos, e os títulos dos testes que os mencionam. Daí anote, **só do que os casos usam**: o método da interface/service que chama a rota (ou que ele falta), os tipos de body/response/enum e o schema, a chave de config, a fixture e os helpers do domínio. Abra um arquivo só quando a decisão depender do corpo dele, não da assinatura.

Se o `ARCHITECTURE.md` indicar um comando de índice próprio do testware, rode-o também.

### 3. Reconciliação com os testes existentes

Os testes da operação são os que a descoberta listou; complete com grep pelo prefixo de ID ou pelo nome do método do service, se preciso. Nada encontrado: modo `criação`, pule para o passo 4.

Leia por completo as specs que casaram e classifique **cada caso**:

| Status | Quando | No plano |
|--------|--------|----------|
| `coberto` | Existe teste com a mesma condição e as mesmas asserções | Nada a fazer; cite o teste |
| `divergente` | Mesma condição, outro resultado esperado | Alterar: o que muda, de quê para quê |
| `parcial` | Existe teste, faltam asserções do caso | Estender o teste |
| `novo` | Não existe teste | Criar |

Depois, o caminho inverso: todo teste da operação sem caso correspondente é **órfão**. Recomende `remover`, `ajustar` ou `manter`, com o motivo. Remoção só acontece com decisão do usuário no checkpoint 2.

Use "Afetado pela última versão" como pista, mas quem decide o status é a comparação com o teste.

**IDs:** casos já cobertos herdam o ID do teste existente; IDs existentes nunca são renumerados. Casos `novo` no modo atualização continuam a numeração do prefixo existente.

### 4. Casos `blocked` (se houver)

Para cada um, procure no testware um jeito de montar a pré-condição ou observar o resultado: outra rota da API, polling até um estado final, dados de ambiente preparados por chave de config, janela fixa para provar um não-efeito. Resultado: `testável` (com o mecanismo e `arquivo:linha`) ou `blocked` confirmado (vai para "Fora do escopo").

### 5. Referência de estilo

Escolha **1** spec de teste parecida (mesmo domínio, mesmo tipo de operação, mesmo uso de polling). No modo atualização, a referência é a própria spec alterada. Sem nenhuma spec no repo, as referências são o service e o schema mais parecidos, e o plano registra que esta spec define o padrão das próximas.

### 6. Matriz de reuso

Para cada pré-condição, ação e asserção dos casos a criar ou alterar: **reusar** (arquivo:linha), **estender** (ex.: método novo num service existente) ou **criar** (arquivo, camada, assinatura). Alteração em algo compartilhado lista todas as specs que o usam (`grep -rln <nome>` nas pastas de teste): elas vão para "Specs impactadas".

### 7. Config, contrato e execução

- **Config:** valor de ambiente novo (URL, ID de massa de teste, credencial) ganha chave na config do testware e entra nos `.env` de cada ambiente. Lembre que uma chave obrigatória nova quebra ambientes sem ela.
- **Contrato:** resposta nova ou alterada muda o tipo **e** o schema juntos, coerentes entre si. Tipo compartilhado lista as operações afetadas.
- **Execução:** decida se a spec precisa de modo `serial` (estado compartilhado), `test.setTimeout` (assíncrono) e massa dedicada por teste, e como evitar estado residual que afete outras specs.

## Formato do `02-plan.md`

```markdown
# <Feature> — Plano de implementação

- Casos: ./01-test-cases.md (fonte <...>, versão da spec <x.y.z>)
- Modo: criação | atualização (motivo, se divergir do indicado)
- Spec de teste: <caminho> (criar | alterar; versão no cabeçalho: <antiga> → <nova>)

## Reconciliação
| Caso | Status | Teste existente | O que muda |

## Testes órfãos
| Teste | Arquivo:linha | Provável motivo | Recomendação |

## Casos blocked reavaliados
| Caso | Resultado | Mecanismo / motivo | Referência |

## Referências a imitar
- `<arquivo>:L-L`: por quê

## Matriz de reuso
| Caso | Passo | Reusar | Estender | Criar |

## Mudanças por camada (ordem de implementação)
Uma seção por camada, na ordem que o ARCHITECTURE.md define (0. pré-requisitos de infraestrutura, se houver → tipos e schemas → services → config → fixtures → helpers → specs). Cada item é **[criar]** ou **[alterar]**; num [alterar], o trecho (`arquivo:linha`) e o antes/depois. Na seção da spec de teste: cabeçalho, estrutura de `describe`, `serial`/timeout e, por caso, `ID: título` → fixture, passos, helpers e asserções.

## Specs impactadas
- <arquivo>: usa <nome alterado>

## Variáveis de ambiente
| Chave na config | Variável | Nova? | Arquivos .env |

## Fora do escopo
- XXX-NN: motivo

## Riscos e pendências
- divergências entre ARCHITECTURE.md e código, estado residual, decisões que só o usuário toma

## Decisões
(preenchida no checkpoint 2)
```
