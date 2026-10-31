// Test de bout en bout sur un serveur Foundry 14 réel, monde jetable hogwarts-system avec le module activé.
// FOUNDRY_URL (défaut http://host.docker.internal:30000). Captures dans test-results/.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const URL = process.env.FOUNDRY_URL ?? "http://host.docker.internal:30000";
const MID = "la-nuit-des-lanternes-indociles";
const OUT = path.resolve(import.meta.dirname, "..", "test-results");
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };

async function login(browser, user) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`${URL}/join`);
  await page.selectOption("select[name=userId]", { label: user });
  await page.click("button[name=join]");
  await page.waitForFunction(() => window.game?.ready, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  return { page, errors };
}

const closeDialogs = page => page.evaluate(() => Object.values(foundry.applications.instances).filter(a => a instanceof foundry.applications.api.DialogV2).forEach(a => a.close()));
const clickDialog = async (page, action) => {
  // La dernière boîte ouverte est celle que l'action vient de déclencher.
  const button = page.locator(`dialog.application button[data-action="${action}"]`).last();
  await button.waitFor({ timeout: 15000 });
  await button.click();
};
// Une promesse côté page qui ne se résout jamais doit faire échouer le test, pas le bloquer.
const settle = (promise, ms = 20000) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("délai dépassé")), ms))]);

const browser = await chromium.launch();
const { page: gm, errors: gmErrors } = await login(browser, process.env.QA_GM ?? "QA MJ");
check("Module actif", await gm.evaluate(m => game.modules.get(m)?.active, MID));
check("Système hogwarts-system", await gm.evaluate(() => `${game.system.id} ${game.system.version}`) === "hogwarts-system 1.2.1");
await closeDialogs(gm);
// Remet à zéro les effets d'un passage précédent dans ce monde jetable.
await gm.evaluate(async m => {
  await game.settings.set(m, "state", {});
  // QA_FRESH : supprime tout le contenu de l'aventure du monde de test pour repartir d'un import neuf.
  for (const name of ["Actor", "Item", "JournalEntry", "Scene", "Macro", "Playlist", "Folder"]) {
    const ids = game.collections.get(name).filter(d => d.getFlag(m, "key")).map(d => d.id);
    if (ids.length) await getDocumentClass(name).deleteDocuments(ids);
  }
  const malo = game.actors.find(a => a.getFlag(m, "key") === "malo");
  if (malo) {
    await malo.update({ "system.health.value": malo.system.health.max });
    const potion = malo.items.find(i => i.type === "potion");
    if (potion) await potion.update({ "system.quantity": 1 });
  }
}, MID);

// Import initial (sauté si le MJ l'a déjà fait depuis la fenêtre d'accueil).
await gm.evaluate(async m => {
  if (game.journal.some(j => j.getFlag(m, "key") === "guide")) return;
  const pack = game.packs.get(`${m}.aventure`);
  const adv = await pack.getDocument(pack.index.contents[0]._id);
  await adv.import({ dialog: false });
}, MID);
await gm.waitForTimeout(6000);
await closeDialogs(gm);
await gm.evaluate(() => Object.values(ui.windows ?? {}).forEach(w => w.close?.()));

const snap = await gm.evaluate(m => {
  const mine = c => c.filter(d => d.getFlag(m, "key"));
  const actors = Object.fromEntries(mine(game.actors).map(a => [a.getFlag(m, "key"), {
    type: a.type, hp: a.system.health?.value, max: a.system.health?.max, owners: Object.entries(a.ownership).filter(([k, v]) => k !== "default" && v >= 3 && !game.users.get(k)?.isGM).length,
    spells: a.items.filter(i => i.type === "spell").map(i => i._stats.compendiumSource),
    potion: a.items.find(i => i.type === "potion")?.system.quantity,
    skill: n => null,
    athl: a.system.skills?.find?.(s => s.name === "Athlétisme")?.value,
    ench: a.system.skills?.find?.(s => s.name === "Enchantements")?.value,
    connaissance: a.system.skills?.find?.(s => s.name === "Connaissance (...)")?.spec,
    dressage: a.system.skills?.find?.(s => s.name === "Dressage/Soin")?.value,
    cp: a.system.experience?.creationPoints, dmg: a.system.damageBonus, idea: a.system.derived?.idea?.value ?? a.system.derived?.idea,
    str: a.system.stats?.str?.total, init: a.system.stats?.dex?.total,
  }]));
  return {
    actors,
    journals: mine(game.journal).map(j => ({ key: j.getFlag(m, "key"), def: j.ownership.default, pages: j.pages.size })),
    scenes: mine(game.scenes).map(s => ({ key: s.getFlag(m, "key"), active: s.active, bg: s.initialLevel?.background?.src, tokens: s.tokens.size, notes: s.notes.size })),
    folders: mine(game.folders).length, macros: mine(game.macros).length, playlists: mine(game.playlists).length, items: mine(game.items).length,
    report: game.journal.find(j => j.getFlag(m, "key") === "tech")?.pages.find(p => p.getFlag(m, "key") === "tech:report")?.text.content,
  };
}, MID);
fs.writeFileSync(path.join(OUT, "snapshot.json"), JSON.stringify(snap, null, 2));

const HP = { alix: 13, noor: 9, malo: 12, iris: 9, tom: 8, wren: 12, maelle: 10, cerf: 5 };
for (const [k, hp] of Object.entries(HP)) check(`PV ${k}`, snap.actors[k]?.max === hp && snap.actors[k]?.hp === hp, `${snap.actors[k]?.hp}/${snap.actors[k]?.max}`);
check("PV Basile 9/10", snap.actors.basile?.hp === 9 && snap.actors.basile?.max === 10, `${snap.actors.basile?.hp}/${snap.actors.basile?.max}`);
check("FOR actuelle d'Alix 14 (malus d'âge)", snap.actors.alix?.str === 14, String(snap.actors.alix?.str));
check("Bonus aux dégâts d'Alix +1d3", snap.actors.alix?.dmg === "+1d3", snap.actors.alix?.dmg);
check("Athlétisme d'Alix 70", snap.actors.alix?.athl === 70, String(snap.actors.alix?.athl));
check("Enchantements de Noor 55", snap.actors.noor?.ench === 55, String(snap.actors.noor?.ench));
check("Spécialisation Connaissance", snap.actors.noor?.connaissance === "Atelier et sécurité");
check("Dressage/Soin de Maëlle 40", snap.actors.maelle?.dressage === 40, String(snap.actors.maelle?.dressage));
check("Points de création sans déficit", ["alix", "noor", "malo", "iris", "tom"].every(k => snap.actors[k].cp.spent <= snap.actors[k].cp.max), JSON.stringify(snap.actors.alix.cp));
for (const k of ["alix", "noor", "malo", "iris", "tom"]) check(`8 sorts et 1 Murlap pour ${k}`, snap.actors[k].spells.length === 8 && snap.actors[k].potion === 1, `${snap.actors[k].spells.length} sorts, potion ${snap.actors[k].potion}`);
check("Sorts copiés depuis le compendium du système", snap.actors.tom.spells.every(u => u?.startsWith("Compendium.hogwarts-system.hogwarts-spells.Item.")));
check("Basile : 6 sorts", snap.actors.basile.spells.length === 6);
check("Prétirés sans joueur propriétaire", ["alix", "noor", "malo", "iris", "tom"].every(k => snap.actors[k].owners === 0));
check("Journaux non partagés", snap.journals.every(j => j.def === 0), `${snap.journals.length} journaux`);
check("13 journaux", snap.journals.length === 13);
check("5 scènes inactives avec fond", snap.scenes.length === 5 && snap.scenes.every(s => !s.active && s.bg), JSON.stringify(snap.scenes.map(s => s.bg?.split("/").pop())));
check("Tokens de la cour", snap.scenes.find(s => s.key === "S01")?.tokens === 10);
check("Dossiers, macros, playlist, objets", snap.folders === 11 && snap.macros === 4 && snap.playlists === 1 && snap.items === 2);
check("Rapport d'import écrit", /Toutes les références/.test(snap.report ?? ""));

// Fond de scène réellement chargé.
await gm.evaluate(m => game.scenes.find(s => s.getFlag(m, "key") === "S01").view(), MID);
await gm.waitForTimeout(5000);
check("Scène S01 affichée", await gm.evaluate(() => canvas.ready && canvas.scene?.navName === "S01"));
await gm.screenshot({ path: path.join(OUT, "01-cour.png") });

// Jet de sort depuis la fiche.
await gm.evaluate(m => game.actors.find(a => a.getFlag(m, "key") === "noor").sheet.render({ force: true }), MID);
await gm.waitForTimeout(2000);
const before = await gm.evaluate(() => game.messages.size);
await gm.evaluate(m => {
  const a = game.actors.find(x => x.getFlag(m, "key") === "noor");
  const item = a.items.find(i => i.name.startsWith("Lévitation"));
  const el = a.sheet.element.querySelector(`[data-action=rollSpell][data-item-id="${item.id}"]`);
  el.click();
}, MID);
await gm.waitForTimeout(2000);
const dlg = await gm.$("dialog.application button[data-action=ok], dialog.application button[data-action=roll], dialog.application form button[type=submit]");
if (dlg) { await gm.screenshot({ path: path.join(OUT, "02-jet-sort.png") }); await dlg.click(); }
await closeDialogs(gm);
await gm.waitForTimeout(2500);
const roll = await gm.evaluate(n => { const m = game.messages.contents.at(-1); return game.messages.size > n ? (m.rolls?.length ?? 0) + " " + m.flavor?.slice(0, 80) + " " + m.content.replace(/<[^>]+>/g, " ").slice(0, 160) : null; }, before);
check("Jet de Lévitation d'objets", !!roll, roll ?? "aucun message");
await gm.evaluate(() => Object.values(foundry.applications.instances).filter(a => a.document).forEach(a => a.close()));

// Soin Murlap : consommation explicite d'une dose.
const murlap = await gm.evaluate(async m => {
  const a = game.actors.find(x => x.getFlag(m, "key") === "malo");
  await a.update({ "system.health.value": 10 });
  const p = a.items.find(i => i.type === "potion");
  await p.update({ "system.quantity": p.system.quantity - 1 });
  await a.update({ "system.health.value": Math.min(a.system.health.max, a.system.health.value + 1) });
  return `${a.system.health.value}/${a.system.health.max}, doses ${p.system.quantity}`;
}, MID);
check("Dose de Murlap (+1 PV, dose retirée)", murlap === "11/12, doses 0", murlap);

// Panneau du défi : parcours complet jusqu'à la victoire.
const api = fn => gm.evaluate(`game.modules.get("${MID}").api.${fn}`);
await api("panel()");
await gm.waitForTimeout(800);
await api("toggleMilestone('incident')");
await api("toggleMilestone('atelier')");
await api("toggleGear('cooler')");
await api("toggleGear('flange')");
await api("toggleClue('loop')");
await gm.evaluate(m => game.modules.get(m).api.startFinale(), MID);
await gm.waitForTimeout(500);
await api("applyGear('flange')");
let s = await api("getState()");
check("Bride refusée tant que Refroidir n'est pas fini", s.ops.isolate === 0 && !s.used.flange);
await api("applyGear('cooler')");
await api("changeOp('cool', 1)");
await api("applyGear('cooler')");
s = await api("getState()");
check("Bénéfice du refroidisseur une seule fois", s.ops.cool === 2 && s.used.cooler, JSON.stringify(s.ops));
await api("endCycle()");
s = await api("getState()");
check("Fin de cycle : +1 surchauffe", s.gauge === 3 && s.cycle === 2, `jauge ${s.gauge}, cycle ${s.cycle}`);
await api("applyGear('flange')");
await api("changeOp('isolate', 1)");
await api("changeOp('disenchant', 1)");
await gm.screenshot({ path: path.join(OUT, "03-panneau.png") });
const victory = gm.evaluate(m => game.modules.get(m).api.changeOp("disenchant", 1), MID);
await clickDialog(gm, "ok");
await settle(victory);
s = await api("getState()");
check("Victoire sans hausse de fin de cycle", s.stopped && s.outcome === "sauvee" && s.gauge === 3, `jauge ${s.gauge}, issue ${s.outcome}`);
const bg = await gm.evaluate(m => game.scenes.find(x => x.getFlag(m, "key") === "S05").initialLevel.background.src, MID);
check("Chambre passée à l'état éteint", bg.endsWith("s05-chambre-eteinte.webp"), bg);

// Fin de secours : remise à zéro puis jauge à 8.
const reset = gm.evaluate(m => game.modules.get(m).api.resetChallenge(), MID);
await clickDialog(gm, "yes");
await settle(reset);
await api("setGauge(7)");
const eight = gm.evaluate(m => game.modules.get(m).api.setGauge(8), MID);
await clickDialog(gm, "confirm");
await settle(eight);
s = await api("getState()");
check("Arrêt de sécurité à 8 confirmé par le MJ", s.stopped && s.outcome === "evacuee" && s.gauge === 8, JSON.stringify({ gauge: s.gauge, outcome: s.outcome }));

// Points de maison (confirmation).
const hp0 = await gm.evaluate(() => game.settings.get("hogwarts-system", "housePoints").toObject?.() ?? game.settings.get("hogwarts-system", "housePoints"));
const award = gm.evaluate(m => game.modules.get(m).api.awardHousePoints(), MID);
await clickDialog(gm, "ok");
await settle(award);
const hp1 = await gm.evaluate(() => game.settings.get("hogwarts-system", "housePoints").toObject?.() ?? game.settings.get("hogwarts-system", "housePoints"));
check("Points de maison après confirmation", hp1.gryffindor - hp0.gryffindor === 10 && hp1.ravenclaw - hp0.ravenclaw === 5, JSON.stringify(hp1));

// Accès joueur : rien de secret, suivi diffusé.
await gm.evaluate(async () => { if (!game.users.getName("Joueur QA")) await User.create({ name: "Joueur QA", role: 1 }); });
await gm.evaluate(m => game.modules.get(m).api.toggleClue("loop"), MID);
const { page: pl, errors: plErrors } = await login(browser, "Joueur QA");
const playerView = await pl.evaluate(m => ({
  journals: game.journal.filter(j => j.getFlag(m, "key") && j.visible).length,
  actors: game.actors.filter(a => a.getFlag(m, "key") && a.visible).length,
  scenesVisible: game.scenes.filter(s => s.getFlag(m, "key") && s.visible).length,
}), MID);
check("Joueur : aucun journal, acteur ni scène visible", playerView.journals === 0 && playerView.actors === 0 && playerView.scenesVisible === 0, JSON.stringify(playerView));
await api("tracker({ broadcast: true })");
await pl.waitForTimeout(2000);
const trackerText = await pl.evaluate(() => document.querySelector("#lanternes-tracker")?.innerText ?? "");
check("Suivi affiché chez le joueur", /Surchauffe/.test(trackerText));
check("Suivi joueur sans conclusion non partagée", !/modification volontaire/.test(trackerText) && /Le circuit renvoie/.test(trackerText));
await pl.screenshot({ path: path.join(OUT, "04-joueur.png") });
// Une aide montrée devient lisible.
await gm.evaluate(m => game.modules.get(m).api.showHandout("A01"), MID);
await pl.waitForTimeout(2500);
check("A01 montrée au joueur", await pl.evaluate(m => game.journal.find(j => j.getFlag(m, "key") === "handout:A01")?.visible, MID));
check("A03 toujours cachée", !(await pl.evaluate(m => game.journal.find(j => j.getFlag(m, "key") === "handout:A03")?.visible, MID)));

// Réimport : réutiliser, puis nouvelle copie.
await gm.evaluate(async m => { const a = game.actors.find(x => x.getFlag(m, "key") === "iris"); await a.update({ name: "Iris (modifiée)" }); await game.journal.find(j => j.getFlag(m, "key") === "handout:A06").delete(); }, MID);
const reuse = gm.evaluate(m => game.modules.get(m).api.openImporter(), MID);
await clickDialog(gm, "reuse");
await settle(reuse);
await gm.waitForTimeout(4000);
const afterReuse = await gm.evaluate(m => ({ iris: game.actors.find(x => x.getFlag(m, "key") === "iris").name, a06: !!game.journal.find(j => j.getFlag(m, "key") === "handout:A06"), actors: game.actors.filter(a => a.getFlag(m, "key")).length }), MID);
check("Réutiliser : modifications gardées, manquants recréés", afterReuse.iris === "Iris (modifiée)" && afterReuse.a06 && afterReuse.actors === 9, JSON.stringify(afterReuse));
const copy = gm.evaluate(m => game.modules.get(m).api.openImporter(), MID);
await clickDialog(gm, "copy");
await settle(copy);
await gm.waitForTimeout(4000);
const afterCopy = await gm.evaluate(m => {
  const guides = game.journal.filter(j => j.getFlag(m, "key") === "guide");
  const copyGuide = guides.at(-1);
  const html = copyGuide.pages.contents.map(p => p.text.content).join("");
  const ids = [...html.matchAll(/@UUID\[(Actor|Scene|JournalEntry)\.([A-Za-z0-9]{16})/g)].map(x => `${x[1]}.${x[2]}`);
  const broken = ids.filter(u => !fromUuidSync(u));
  const copyIds = new Set([...game.actors, ...game.scenes, ...game.journal].filter(d => d.folder?.name?.includes("copie") || d.folder?.folder?.name?.includes("copie")).map(d => `${d.documentName}.${d.id}`));
  return { actors: game.actors.filter(a => a.getFlag(m, "key")).length, guides: guides.length, links: ids.length, broken: broken.length, toCopy: ids.filter(u => copyIds.has(u)).length,
    copySpells: game.actors.filter(a => a.getFlag(m, "key") === "tom").at(-1).items.filter(i => i.type === "spell").length };
}, MID);
check("Nouvelle copie complète et liens réécrits", afterCopy.actors === 18 && afterCopy.guides === 2 && afterCopy.broken === 0 && afterCopy.toCopy === afterCopy.links && afterCopy.copySpells === 8, JSON.stringify(afterCopy));

// Guide du MJ.
await gm.evaluate(m => game.modules.get(m).api.openGuide(), MID);
await gm.waitForTimeout(2500);
await gm.screenshot({ path: path.join(OUT, "05-guide.png") });

const relevant = e => /lanternes|la-nuit|module\.mjs/i.test(e);
check("Aucune erreur console du module (MJ)", !gmErrors.some(relevant), gmErrors.filter(relevant).join(" | ").slice(0, 400));
check("Aucune erreur console du module (joueur)", !plErrors.some(relevant), plErrors.filter(relevant).join(" | ").slice(0, 400));
fs.writeFileSync(path.join(OUT, "errors.txt"), [...gmErrors, "--- joueur ---", ...plErrors].join("\n"));
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
await browser.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} contrôles réussis.`);
process.exit(failed ? 1 : 0);
