import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const onlySrc = process.argv.includes("--src");
const codeOnly = process.argv.includes("--code");
const START = onlySrc ? path.join(ROOT, "src") : ROOT;

/** Binários / locks: contam linhas de forma enganosa se lidos como texto. */
const EXCLUDE_EXT_CODE = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".lock",
  ".lockb",
]);

const EXCLUDE_DIR = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  "coverage",
  ".cursor",
  "mcps",
  "assets",
]);

const linesByExt = {};
const filesByExt = {};

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!EXCLUDE_DIR.has(ent.name)) walk(p);
      continue;
    }
    if (codeOnly && ent.name === "package-lock.json") continue;
    const ext = path.extname(ent.name).toLowerCase() || "(sem extensão)";
    if (codeOnly && EXCLUDE_EXT_CODE.has(ext)) continue;
    let text;
    try {
      text = fs.readFileSync(p, "utf8");
    } catch {
      continue;
    }
    const n = text.split(/\r?\n/).length;
    linesByExt[ext] = (linesByExt[ext] || 0) + n;
    filesByExt[ext] = (filesByExt[ext] || 0) + 1;
  }
}

walk(START);

const scope = [
  onlySrc ? "src/" : "raiz do repo",
  codeOnly ? "apenas ficheiros de código (sem PDF/imagens/locks/package-lock)" : "todos os ficheiros de texto",
].join(" · ");

const LANG = {
  ".ts": "TypeScript",
  ".tsx": "TSX (TypeScript + React)",
  ".js": "JavaScript",
  ".jsx": "JavaScript (JSX)",
  ".css": "CSS",
  ".html": "HTML",
  ".md": "Markdown",
  ".sql": "SQL",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".json": "JSON",
  ".mjs": "JavaScript (ESM)",
  ".cjs": "JavaScript (CommonJS)",
};

const totalLines = Object.values(linesByExt).reduce((a, b) => a + b, 0);
const rows = Object.entries(linesByExt)
  .map(([ext, lines]) => ({
    ext,
    label: LANG[ext] ?? ext,
    lines,
    files: filesByExt[ext],
    pct: totalLines ? (100 * lines) / totalLines : 0,
  }))
  .sort((a, b) => b.lines - a.lines);

console.log(JSON.stringify({ scope, start: START, totalLines, rows }, null, 2));
