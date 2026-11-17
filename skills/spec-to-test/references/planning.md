# Phase 2 — Implementation plan

Whoever implements will read **only the plan** and `ARCHITECTURE.md`. Everything they need to know about the repo goes into the plan, with `file:line`.

In this phase, testware code is only read: the only file written is `02-plan.md` (and `ARCHITECTURE.md`, in the case of step 1). Values in `.env*` are never read; list only the keys:

```bash
for f in .env*; do echo "$f"; grep -oE '^[A-Za-z0-9_]+=' "$f" | sort -u; done
```

## How to search

Build the plan **reading as little as possible**. Discovery (step 2) already delivers the map with line numbers; each read after it answers a question the plan needs to cite.

1. **Targeted grep** (`grep -rn`) only for what discovery didn't answer.
2. **Ranged Read** (`offset`/`limit`, up to ~150 lines) around what discovery or grep pointed to. Cite `file:line` with the number they already gave.
3. **Full read** only of the operation's test specs (step 3) and of one reference spec (step 5).
4. **Budget:** discovery opens a budget of 15 reads (Read, Grep, Glob and read-only Bash outside `.test-generation/`), enforced by the skill's hook. Writing `02-plan.md` closes the budget. When it runs out, reads are blocked: write the plan with what you have and list what was left unverified under "Risks and open items". For a large testware, raise it with `--budget N`.

## Process

### 1. Conventions

Read `ARCHITECTURE.md` at the testware root. It defines the layers (where types, schemas, interfaces, services, config, fixtures, helpers and specs live), naming, waiting patterns and prohibitions. The plan follows `ARCHITECTURE.md`; where existing code diverges from it, follow the document and note the divergence under "Risks and open items".

**Without `ARCHITECTURE.md`** (and with the draft authorized at checkpoint 1), build a draft. This is done once per testware, and its reads don't count against the budget:

1. Fill in [`../templates/ARCHITECTURE.md`](../templates/ARCHITECTURE.md) with what the repo shows: `ls` of the top-level folders, `playwright.config.*`, `package.json`, the config, the HTTP client, 1 service with its interface, 1 model, 1 schema, the base fixture and 1 spec.
2. Mark each rule as **[current]** (the code already does it) or **[proposed]** (a new convention the cases require, e.g. ID in the title). Divergences between code and rule go in with `file:line`.
3. Check the approved cases against the infrastructure: whatever they need to verify that the testware can't (HTTP status not exposed by the client, call without a token, no typecheck) becomes an open item with options and a recommendation, at the end of the draft.
4. Write it to `.test-generation/ARCHITECTURE.draft.md` and **stop**: show the summary and the open items and ask for decisions.
5. With approval, write the final `ARCHITECTURE.md` at the root (without the open items section) and go on to step 2. Decisions that require changing the infrastructure go into the plan as layer **0. Prerequisites**.

### 2. Discovery

Run it with the domain and route from `01-test-cases.md` (and the infrastructure pieces `ARCHITECTURE.md` mentions, in `--also`):

```bash
node "<skill base directory, given when it was loaded>/scripts/discover.mjs" <domain> <route-fragment> [--also <file>]... [--budget N]
# e.g.: node .../discover.mjs job /api/Job --also core/HttpClient.ts --also tests/baseTest.ts
```

The output lists, with `file:line`: the routes in production code, the skeleton (exports, methods with signatures, type fields) of each file that mentions the terms, and the titles of the tests that mention them. From it, note **only what the cases use**: the interface/service method that calls the route (or that it's missing), the body/response/enum types and the schema, the config key, the fixture and the domain helpers. Open a file only when the decision depends on its body, not its signature.

If `ARCHITECTURE.md` points to an index command of the testware's own, run it too.

### 3. Reconciliation with existing tests

The operation's tests are the ones discovery listed; complete with a grep for the ID prefix or the service method name, if needed. Nothing found: `create` mode, skip to step 4.

Read the matching specs in full and classify **each case**:

| Status | When | In the plan |
|--------|------|-------------|
| `covered` | A test exists with the same condition and the same assertions | Nothing to do; cite the test |
| `divergent` | Same condition, different expected result | Change: what changes, from what to what |
| `partial` | A test exists, missing some of the case's assertions | Extend the test |
| `new` | No test exists | Create |

Then the reverse direction: every test of the operation with no matching case is an **orphan**. Recommend `remove`, `adjust` or `keep`, with the reason. Removal only happens with a user decision at checkpoint 2.

Use "Affected by latest version" as a hint, but the status is decided by comparing with the test.

**IDs:** already covered cases inherit the existing test's ID; existing IDs are never renumbered. `new` cases in update mode continue the existing prefix's numbering.

### 4. `blocked` cases (if any)

For each one, look in the testware for a way to set up the precondition or observe the result: another API route, polling until a final state, environment data prepared by config key, a fixed window to prove a non-effect. Result: `testable` (with the mechanism and `file:line`) or `blocked` confirmed (goes to "Out of scope").

### 5. Style reference

Pick **1** similar test spec (same domain, same kind of operation, same use of polling). In update mode, the reference is the changed spec itself. With no spec in the repo, the references are the most similar service and schema, and the plan records that this spec sets the pattern for the next ones.

### 6. Reuse matrix

For each precondition, action and assertion of the cases to create or change: **reuse** (file:line), **extend** (e.g. new method on an existing service) or **create** (file, layer, signature). A change to something shared lists every spec that uses it (`grep -rln <name>` in the test folders): they go under "Impacted specs".

### 7. Config, contract and execution

- **Config:** a new environment value (URL, test data ID, credential) gets a key in the testware's config and goes into each environment's `.env`. Remember that a new required key breaks environments without it.
- **Contract:** a new or changed response changes the type **and** the schema together, consistent with each other. A shared type lists the affected operations.
- **Execution:** decide whether the spec needs `serial` mode (shared state), `test.setTimeout` (async) and dedicated test data per test, and how to avoid residual state that affects other specs.

## `02-plan.md` format

```markdown
# <Feature> — Implementation plan

- Cases: ./01-test-cases.md (source <...>, spec version <x.y.z>)
- Mode: create | update (reason, if it differs from the indicated one)
- Test spec: <path> (create | change; version in header: <old> → <new>)

## Reconciliation
| Case | Status | Existing test | What changes |

## Orphan tests
| Test | File:line | Likely reason | Recommendation |

## Blocked cases re-evaluated
| Case | Result | Mechanism / reason | Reference |

## References to imitate
- `<file>:L-L`: why

## Reuse matrix
| Case | Step | Reuse | Extend | Create |

## Changes by layer (implementation order)
One section per layer, in the order ARCHITECTURE.md defines (0. infrastructure prerequisites, if any → types and schemas → services → config → fixtures → helpers → specs). Each item is **[create]** or **[change]**; for a [change], the snippet (`file:line`) and the before/after. In the test spec section: header, `describe` structure, `serial`/timeout and, per case, `ID: title` → fixture, steps, helpers and assertions.

## Impacted specs
- <file>: uses <changed name>

## Environment variables
| Config key | Variable | New? | .env files |

## Out of scope
- XXX-NN: reason

## Risks and open items
- divergences between ARCHITECTURE.md and code, residual state, decisions only the user makes

## Decisions
(filled in at checkpoint 2)
```
