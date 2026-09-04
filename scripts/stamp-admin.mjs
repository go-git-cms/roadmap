// Cache-bust the editor bundle in public/admin/index.html.
//
// `gogitcms-editor build` emits app.js and app.css with deliberately stable
// names. Right for something deployed once, wrong for something `make
// roadmap-dev` rebuilds on every run: a browser that cached app.js keeps
// running it, and the editor silently stays on the previous build's baked-in
// API_URL / WORKSPACE_ID / REPOSITORY_ID. So each asset URL gets
// ?v=<hash of its own bytes>; index.html itself is served no-store by the
// Caddyfile, which is what makes the new URL reach the browser at all.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.argv[2] ?? "public/admin");
const indexFile = path.join(dir, "index.html");

if (!fs.existsSync(indexFile)) {
  console.error(`stamp-admin: no index.html in ${dir}`);
  process.exit(1);
}

const short = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 8);

let html = fs.readFileSync(indexFile, "utf8");
const stamped = [];

for (const asset of ["app.js", "app.css"]) {
  const file = path.join(dir, asset);
  if (!fs.existsSync(file)) continue;
  const v = short(file);
  // Match the asset with any existing ?v=, so re-stamping is idempotent.
  const re = new RegExp(`(/admin/${asset.replace(".", "\\.")})(\\?v=[a-f0-9]+)?`, "g");
  html = html.replace(re, `$1?v=${v}`);
  stamped.push(`${asset}?v=${v}`);
}

fs.writeFileSync(indexFile, html);
console.log(`stamped ${stamped.join(" ") || "(nothing)"}`);
