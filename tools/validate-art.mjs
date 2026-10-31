// Contrôles de livraison : dimensions, alpha et calage Foundry avant/après.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = data => crypto.createHash("sha256").update(data).digest("hex");
const lock = JSON.parse(read("tools/art-registration.json"));
const adventure = JSON.parse(read("src/aventure/adventure.json"));
assert.equal(sha(read("tools/layout.mjs")), lock.layoutSha256, "Disposition des cartes modifiée");
assert.equal(sha(JSON.stringify(adventure.scenes)), lock.scenesSha256, "Données de scène Foundry modifiées");

let bytes = 0;
for (const [file, expected] of Object.entries(lock.assets)) {
  const buffer = read(`assets/${file}`);
  bytes += buffer.length;
  const img = sharp(buffer);
  const meta = await img.metadata();
  assert.equal(meta.format, "webp", `${file} : format`);
  assert.equal(meta.width, expected.width, `${file} : largeur`);
  assert.equal(meta.height, expected.height, `${file} : hauteur`);
  assert.equal(Boolean(meta.hasAlpha), expected.hasAlpha, `${file} : transparence`);
  if (expected.alphaSha256) {
    const alpha = await img.ensureAlpha().extractChannel(3).raw().toBuffer();
    assert.equal(sha(alpha), expected.alphaSha256, `${file} : masque de token modifié`);
  }
  // Détecte aussi une image incorporée manquante (portrait, fond ou matière vide).
  const stats = await img.stats();
  assert.ok(stats.entropy > 4, `${file} : contenu visuel insuffisant`);
  if (!expected.hasAlpha) assert.ok(stats.isOpaque, `${file} : fond transparent inattendu`);
}
for (const [a, b] of [["s01-cour-fete", "s01-cour-incident"], ["s05-chambre-allumee", "s05-chambre-eteinte"]]) {
  assert.notEqual(sha(read(`assets/maps/${a}.webp`)), sha(read(`assets/maps/${b}.webp`)), "États de carte identiques");
}
const sources = JSON.parse(read("tools/art-prompts.json")).assets;
for (const entry of Object.values(sources)) assert.ok(fs.existsSync(path.join(ROOT, entry.source)), `Source absente : ${entry.source}`);
const phoenixAlpha = await sharp(read("tools/artwork/phoenix.webp")).metadata();
assert.ok(phoenixAlpha.hasAlpha, "Le phénix doit conserver son détourage");
console.log(`Illustrations OK : ${Object.keys(lock.assets).length} WebP, ${(bytes / 1024 / 1024).toFixed(2)} Mio ; dimensions et neuf masques alpha inchangés ; cinq scènes et disposition strictement identiques.`);
