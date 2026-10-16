// Turns the Vite build (dist/) into a publishable artifact folder (artifact/).
// The artifact host wraps the page in its own <!doctype><html><head><body> skeleton,
// so the page keeps only its title, meta, links, styles and scripts plus the body markup.
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
const out = join(root, "artifact");
const keepCheckpoint = existsSync(join(out, "checkpoint"));
if (keepCheckpoint) cpSync(join(out, "checkpoint"), join(root, ".checkpoint-tmp"), { recursive: true });
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(dist, "assets"), join(out, "assets"), { recursive: true });
cpSync(join(dist, "data"), join(out, "data"), { recursive: true });
if (keepCheckpoint) { cpSync(join(root, ".checkpoint-tmp"), join(out, "checkpoint"), { recursive: true }); rmSync(join(root, ".checkpoint-tmp"), { recursive: true, force: true }); }

const html = readFileSync(join(dist, "index.html"), "utf8");
const head = (html.match(/<head>([\s\S]*?)<\/head>/) || [, ""])[1]
  .replace(/<meta charset="[^"]*"\s*\/?>/i, "")
  .replace(/<meta name="viewport"[^>]*>/i, "")
  .trim();
const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/) || [, ""])[1].trim();
writeFileSync(join(out, "index.html"), `${head}\n${body}\n`);
console.log("artifact: wrote artifact/index.html with", head.split("\n").length, "head lines");
