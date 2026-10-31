// Prépare dist/<id>.zip (module installable) et dist/module.json pour la release GitHub.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const module = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
const DIST = path.join(ROOT, "dist");
const INCLUDE = ["module.json", "README.md", "CHANGELOG.md", "LICENSE", "scripts", "styles", "assets", "packs"];

fs.rmSync(DIST, { recursive: true, force: true });
const stage = path.join(DIST, module.id);
fs.mkdirSync(stage, { recursive: true });
for (const entry of INCLUDE) fs.cpSync(path.join(ROOT, entry), path.join(stage, entry), { recursive: true });
// Le verrou et le journal texte de LevelDB n'ont rien à faire dans l'archive.
for (const f of fs.readdirSync(path.join(stage, "packs", "aventure"))) {
  if (f === "LOCK" || f === "LOG" || f === "LOG.old") fs.rmSync(path.join(stage, "packs", "aventure", f));
}
const zip = `${module.id}.zip`;
execFileSync("zip", ["-qr", path.join("..", zip), "."], { cwd: stage });
fs.copyFileSync(path.join(ROOT, "module.json"), path.join(DIST, "module.json"));
console.log(`dist/${zip} et dist/module.json prêts (v${module.version}).`);
