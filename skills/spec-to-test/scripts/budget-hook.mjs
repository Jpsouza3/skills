#!/usr/bin/env node
// Hook PreToolUse do spec-to-test: limita as leituras da fase 2.
// Só atua enquanto existir .test-generation/.read-budget (criado pelo discover.mjs).
// Gravar o 02-plan.md fecha o orçamento. Leituras dentro de .test-generation/ e da
// própria skill não contam.

import fs from "node:fs";
import path from "node:path";

let input = "";
for await (const chunk of process.stdin) input += chunk;
let ev;
try { ev = JSON.parse(input); } catch { process.exit(0); }

// Acha o .read-budget subindo a partir do cwd (o agente pode ter feito cd).
let dir = ev.cwd || process.cwd();
let budgetFile = null;
for (;;) {
  const p = path.join(dir, ".test-generation", ".read-budget");
  if (fs.existsSync(p)) { budgetFile = p; break; }
  const up = path.dirname(dir);
  if (up === dir) break;
  dir = up;
}
if (!budgetFile) process.exit(0);

const tool = ev.tool_name;
const ti = ev.tool_input || {};
const target = String(ti.file_path || ti.path || ti.pattern || ti.command || "");

// Gravar o plano fecha a fase.
if ((tool === "Write" || tool === "Edit") && /02-plan\.md$/.test(ti.file_path || "")) {
  try {
    const s = JSON.parse(fs.readFileSync(budgetFile, "utf8"));
    const log = path.join(path.dirname(budgetFile), "budget.log");
    fs.appendFileSync(log, `${new Date().toISOString()}\t${ti.file_path}\tleituras ${s.used}/${s.limit}${s.blocked ? `\tbloqueios ${s.blocked}` : ""}\n`);
  } catch {}
  fs.rmSync(budgetFile, { force: true });
  process.exit(0);
}

const FREE = /\.test-generation\/|\/spec-to-test\/|ARCHITECTURE(\.draft)?\.md/;
let counts = false;
if (tool === "Read" || tool === "Grep" || tool === "Glob") counts = !FREE.test(target);
else if (tool === "Bash") {
  const readish = /(^|[\s;&|(])(cat|head|tail|sed|awk|grep|rg|find|ls|less|more|tree|git\s+(show|grep|log))\b/;
  counts = readish.test(target) && !/discover\.mjs/.test(target) && !FREE.test(target);
}
if (!counts) process.exit(0);

let state;
try { state = JSON.parse(fs.readFileSync(budgetFile, "utf8")); } catch { process.exit(0); }
if (state.used >= state.limit) {
  state.blocked = (state.blocked || 0) + 1;
  fs.writeFileSync(budgetFile, JSON.stringify(state) + "\n");
  process.stderr.write(
    `Orçamento de descoberta da fase 2 esgotado (${state.limit} leituras). ` +
    `Escreva agora o .test-generation/<slug>/02-plan.md com o que já tem e liste em "Riscos e pendências" o que ficou sem verificar.\n`
  );
  process.exit(2);
}
state.used += 1;
fs.writeFileSync(budgetFile, JSON.stringify(state) + "\n");
process.exit(0);
