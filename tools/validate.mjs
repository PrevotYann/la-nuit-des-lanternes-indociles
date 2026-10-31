// Vérifie que chaque fichier référencé (aventure et manifeste) existe, et que le manifeste est cohérent.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const module = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
const adventure = fs.readFileSync(path.join(ROOT, "src", "aventure", "adventure.json"), "utf8");
const prefix = `modules/${module.id}/`;
const errors = [];

const refs = new Set([...`${adventure}${JSON.stringify(module)}`.matchAll(new RegExp(`${prefix}[^"'\\s)]+`, "g"))].map(m => m[0]));
for (const ref of refs) if (!fs.existsSync(path.join(ROOT, ref.slice(prefix.length)))) errors.push(`Fichier manquant : ${ref}`);
for (const file of [...module.esmodules, ...module.styles]) if (!fs.existsSync(path.join(ROOT, file))) errors.push(`Fichier manquant : ${file}`);
for (const pack of module.packs) if (!fs.existsSync(path.join(ROOT, pack.path, "CURRENT"))) errors.push(`Pack non construit : ${pack.path}`);
if (!module.download.includes(`/v${module.version}/`)) errors.push(`download ne cible pas v${module.version}`);
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
if (pkg.version !== module.version) errors.push(`package.json ${pkg.version} ≠ module.json ${module.version}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Validation OK : ${refs.size} fichiers référencés présents.`);
