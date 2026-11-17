# ARCHITECTURE

<!--
Template do spec-to-test. Copie para a raiz do testware e preencha.
É a fonte única das convenções: a fase 2 do spec-to-test planeja a partir dele, e quem implementa o plano segue ele.
Escreva regras imperativas e curtas. Tire as seções que não se aplicam. Prefira citar um arquivo de exemplo a explicar em prosa.
No rascunho gerado pela skill, [atual] = o código já faz; [proposto] = convenção nova. Depois de aprovado, os marcadores podem sair.
-->

Testes de API com Playwright + TypeScript, sobre o boilerplate testware-core (`HttpClient` → `PlaywrightHttpClient`, `ContractValidator` com AJV).

## Camadas

| Camada | Onde | Convenção | Exemplo |
|--------|------|-----------|---------|
| HTTP | `core/http/` | `HttpClient` é a abstração; `PlaywrightHttpClient` é a única que usa `APIRequestContext` | `core/http/HttpClient.ts` |
| Config | `core/config/<Arquivo>.ts` | `config.<chave>` lida de `.env.<ENV>`; chave obrigatória com `required(...)` | |
| Contrato | `<pasta dos schemas>/<Nome>Schema.ts` | Schema AJV, `additionalProperties: false`, validado com `ContractValidator.validate(schema, body)` | |
| Tipos / models | `<pasta>/` | `<Método><Recurso>Body`, `<Método><Recurso>Response`; enums como union de strings; builder quando houver | |
| Interface | `<pasta>/<Domínio>Interface.ts` | Métodos PascalCase `<Método><Recurso>(...)` | |
| Service | `services/<Domínio>Service.ts` | `implements` a interface, recebe `HttpClient` no construtor, sem asserções | |
| Fixtures | `<fixtures/ApiFixtures.ts ou tests/baseTest.ts>` | Entrega service/client autenticado; exporta `test` e `expect` | |
| Helpers | `tests/helpers/<domínio>/` | Montagem de massa, fluxos com várias chamadas, `expect*` reutilizáveis | |
| Specs | `tests/<domínio>/<operação>.spec.ts` | Importam `test`/`expect` da fixture, nunca de `@playwright/test`; só testes | |

## URL base e rotas

<!-- Ex.: "rota relativa; baseURL vem da fixture" OU "service monta `${config.baseUrl}/api/...`". `encodeURIComponent` em parâmetros de rota? -->

## Autenticação

<!-- Como o token é obtido e aplicado (fixture de login, setToken, storageState). -->

## Respostas

<!-- Formato do retorno do HttpClient (ex.: `{ body, raw }` ou `{ success, data, message }`), como ler status e headers, formato padrão de erro e schema de erro. -->

## Specs de teste

- Título: `<PREFIXO>-NN: <descrição>` (o ID liga o teste ao caso da spec)
- Cabeçalho de comentário com a versão da spec da feature `(vX.Y.Z)` e o resumo da regra
- `test.step` para cada fase do caso (preparação, ação, verificação)

## Assíncrono e estado

- Espera por status: `expect.poll(...)` ou `expect(...).toPass({ timeout })`, com timeout explícito. `waitForTimeout` só numa janela fixa para provar que algo **não** aconteceu.
- `fullyParallel`: <sim/não>. Specs com estado compartilhado usam `test.describe.configure({ mode: "serial" })`.
- Efeitos são observados por: <só API | banco | fila | ...>
- Massa de teste: <criada pelo teste via API | pré-configurada por chave de config>

## Ambientes

- Arquivos: `.env.<ENV>`, `ENV` padrão `<local>`. Ambientes onde os testes nunca rodam a partir de automação: <prod>.

## Validação

- Typecheck: `<npm run typecheck | npx tsc --noEmit>`
- Listar testes: `npx playwright test <spec> --list`
- Índice (opcional): `<npm run testware:index>`

## Proibições

<!-- Regras duras do projeto, cada uma com o que fazer no lugar. -->
