#!/usr/bin/env node
// spec-to-test phase 2 discovery: in a single call, shows what the testware
// already has for the operation's terms (domain, resource, route fragment).
// No dependencies. Opens the read budget used by the budget-hook.mjs hook.
//
// Usage: node discover.mjs <term> [term...] [--also <path>]... [--budget N]
// E.g.:  node discover.mjs job /api/Job --also core/HttpClient.ts --budget 15

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const terms = [];
const also = [];
let budget = 15;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--also") also.push(args[++i]);
  else if (args[i] === "--budget") budget = Number(args[++i]);
  else terms.push(args[i]);
}
if (!terms.length) {
  console.error("usage: discover.mjs <term> [term...] [--also <path>] [--budget N]");
  process.exit(1);
}

const IGNORE = /(^|\/)(node_modules|dist|build|playwright-report|test-results|blob-report|\.test-generation|\.git)\//;
const isTest = (f) => /\.(spec|test)\.[cm]?[jt]sx?$/.test(f);

function listFiles() {
  try {
    return execSync("git ls-files -co --exclude-standard", { encoding: "utf8", maxBuffer: 64 << 20 })
      .split("\n")
      .filter((f) => /\.[cm]?[jt]sx?$/.test(f) && !IGNORE.test(f) && !f.endsWith(".d.ts"));
  } catch {
    const out = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (IGNORE.test(p + "/")) continue;
        if (e.isDirectory()) walk(p);
        else if (/\.[cm]?[jt]sx?$/.test(e.name)) out.push(p);
      }
    };
    walk(".");
    return out;
  }
}

const norm = (t) => t.toLowerCase().replace(/^\/+|\/+$/g, "");
const needles = terms.map(norm).filter(Boolean);
const routeNeedles = terms.filter((t) => t.includes("/")).map((t) => "/" + norm(t));
const matches = (s) => needles.some((n) => s.toLowerCase().includes(n));

const CONTROL = /^(if|for|while|switch|catch|return|function|await|new|super|typeof|throw|else)$/;
const MAX_OUTLINE = 60;

// File skeleton: exports, class/interface members with signatures, type fields.
function outline(lines) {
  const out = [];
  const open = (s) => (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
  // Join a multi-line signature while there is an open "(" (and the return type, if it comes on the next line).
  const joinSig = (i) => {
    let s = lines[i].trim(), j = i;
    while (open(s) > 0 && j + 1 < lines.length && j - i < 8) s += " " + lines[++j].trim();
    if (j + 1 < lines.length && /^\s*:/.test(lines[j + 1])) s += " " + lines[++j].trim();
    s = s.replace(/\s+/g, " ").replace(/\(\s/g, "(").replace(/,?\s\)/g, ")").replace(/\s*[;{]\s*$/, "");
    return [s, j];
  };
  let inType = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const l = raw.trim();
    const n = i + 1;
    if (/^export\s/.test(l) || /^(abstract\s+)?class\s|^interface\s|^type\s/.test(l)) {
      out.push(`${n}: ${l}`);
      inType = /\b(type|interface)\b/.test(l) && /\{\s*$/.test(l);
      continue;
    }
    if (inType) {
      if (/^\}/.test(l)) { inType = false; continue; }
      if (/^[A-Za-z_]\w*\??\s*(<[^>]*>)?\s*\(/.test(l)) {
        const [s, j] = joinSig(i);
        out.push(`${n}:   ${s}`);
        i = j;
      } else if (/^[\w"']+\??\s*:/.test(l)) out.push(`${n}:   ${l}`);
      continue;
    }
    const m = l.match(/^(public\s+|private\s+|protected\s+|static\s+|async\s+)*([A-Za-z_]\w*)\s*(<[^>]*>)?\s*\(/);
    if (m && !CONTROL.test(m[2]) && /^\s{1,8}\S/.test(raw)) {
      const [s, j] = joinSig(i);
      out.push(`${n}:   ${s}`);
      i = j;
    }
  }
  return out.length > MAX_OUTLINE ? [...out.slice(0, MAX_OUTLINE), `... (+${out.length - MAX_OUTLINE} lines)`] : out;
}

const files = listFiles();
const prod = [];
const tests = [];
const routes = [];

for (const f of files) {
  let text;
  try { text = fs.readFileSync(f, "utf8"); } catch { continue; }
  const lines = text.split("\n");
  if (routeNeedles.length && !isTest(f)) {
    lines.forEach((l, i) => {
      if (/^\s*(import|export\s+type)\b/.test(l) || !/["'`]/.test(l)) return;
      if (routeNeedles.some((r) => l.toLowerCase().includes(r))) routes.push(`${f}:${i + 1}: ${l.trim()}`);
    });
  }
  if (!matches(f) && !matches(text)) continue;
  (isTest(f) ? tests : prod).push({ f, lines });
}

const hr = (t) => console.log(`\n## ${t}\n`);

console.log(`# Discovery: ${terms.join(" ")}`);
console.log(`(${files.length} code files scanned; none needs to be opened to know what is listed here)`);

hr(`Routes in production code containing ${routeNeedles.join(", ") || "(no term with /)"}`);
console.log(routes.length ? routes.join("\n") : "none");

hr("Production code mentioning the terms (skeleton with lines)");
if (!prod.length) console.log("none");
for (const { f, lines } of prod.sort((a, b) => a.f.localeCompare(b.f))) {
  console.log(`### ${f}`);
  console.log(outline(lines).join("\n") || "(no exports)");
  console.log();
}

hr("Tests mentioning the terms");
if (!tests.length) console.log("none");
for (const { f, lines } of tests.sort((a, b) => a.f.localeCompare(b.f))) {
  console.log(`### ${f}`);
  lines.forEach((l, i) => {
    const m = l.match(/\btest(?:\.describe)?(?:\.(?:only|skip|serial|fixme))?\(\s*(["'`])(.*?)\1/);
    if (m) console.log(`${i + 1}: ${l.includes("describe") ? "describe " : ""}${m[2]}`);
  });
  console.log();
}

for (const a of also) {
  hr(`Skeleton of ${a}`);
  try { console.log(outline(fs.readFileSync(a, "utf8").split("\n")).join("\n") || "(no exports)"); }
  catch { console.log("not found"); }
}

// Open the phase 2 read budget (read by budget-hook.mjs).
fs.mkdirSync(".test-generation", { recursive: true });
if (!fs.existsSync(".test-generation/.gitignore")) fs.writeFileSync(".test-generation/.gitignore", "*\n");
fs.writeFileSync(".test-generation/.read-budget", JSON.stringify({ used: 0, limit: budget }) + "\n");
console.log(`\n---\nBudget opened: ${budget} reads until 02-plan.md is written.`);
