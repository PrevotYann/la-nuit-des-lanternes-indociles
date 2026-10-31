// Lecture des compendiums du système hogwarts-system réellement installé.
// HP_SYSTEM pointe vers le dossier du système (par défaut monté en /hp dans le conteneur de build).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ClassicLevel } from "classic-level";

export const SYSTEM_PATH = process.env.HP_SYSTEM ?? "/hp";

export function systemManifest() {
  return JSON.parse(fs.readFileSync(path.join(SYSTEM_PATH, "system.json"), "utf8"));
}

/** Documents d'un pack LevelDB, lus depuis une copie pour ne jamais toucher au verrou du serveur. */
export async function readPack(name) {
  const src = path.join(SYSTEM_PATH, "packs", name);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
  for (const f of fs.readdirSync(src)) {
    const p = path.join(src, f);
    if (fs.statSync(p).isFile() && f !== "LOCK") fs.copyFileSync(p, path.join(tmp, f));
  }
  const db = new ClassicLevel(tmp, { valueEncoding: "json" });
  const docs = new Map();
  for await (const [key, value] of db.iterator()) {
    if (key.split("!").length === 3) docs.set(value._id, value);
  }
  await db.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  return docs;
}
