#!/usr/bin/env node
// spec-to-test PreToolUse hook: limits phase 2 reads.
// Only active while .test-generation/.read-budget exists (created by discover.mjs).
// Writing 02-plan.md closes the budget. Reads inside .test-generation/ and the
// skill itself don't count.

import fs from "node:fs";
import path from "node:path";

let input = "";
for await (const chunk of process.stdin) input += chunk;
let ev;
try { ev = JSON.parse(input); } catch { process.exit(0); }

// Find .read-budget walking up from cwd (the agent may have cd'd).
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

// Writing the plan closes the phase.
if ((tool === "Write" || tool === "Edit") && /02-plan\.md$/.test(ti.file_path || "")) {
  try {
    const s = JSON.parse(fs.readFileSync(budgetFile, "utf8"));
    const log = path.join(path.dirname(budgetFile), "budget.log");
    fs.appendFileSync(log, `${new Date().toISOString()}\t${ti.file_path}\treads ${s.used}/${s.limit}${s.blocked ? `\tblocked ${s.blocked}` : ""}\n`);
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
    `Phase 2 discovery budget exhausted (${state.limit} reads). ` +
    `Write .test-generation/<slug>/02-plan.md now with what you have and list what was left unverified under "Risks and open items".\n`
  );
  process.exit(2);
}
state.used += 1;
fs.writeFileSync(budgetFile, JSON.stringify(state) + "\n");
process.exit(0);
