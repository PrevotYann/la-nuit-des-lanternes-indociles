// Construit le compendium Adventure (packs/aventure) depuis le scénario Markdown,
// les tables de tools/data.mjs, la disposition de tools/layout.mjs et le système installé.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { MID, PCS, NPCS, STAG, SPELLS, COMPENDIUM_REFS, EXPECTED, pcSkills, pcStats, npcSkills } from "./data.mjs";
import { MAPS, GRID } from "./layout.mjs";
import { readPack, systemManifest } from "./system.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const MODULE = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
const SOURCE = fs.readFileSync(path.join(ROOT, "source", "La_Nuit_des_Lanternes_Indociles.md"), "utf8").replace(/\r\n/g, "\n");
const A = p => `modules/${MID}/assets/${p}`;
const STATS = { coreVersion: "14.369", systemId: "hogwarts-system", systemVersion: "1.2.1" };
const OWN = { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 };

/* -------------------------------------------- */
/*  Identifiants stables                        */
/* -------------------------------------------- */

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const seen = new Map();
function id(key) {
  const bytes = crypto.createHash("sha256").update(`${MID}:${key}`).digest();
  const out = Array.from(bytes.subarray(0, 16), b => ALNUM[b % ALNUM.length]).join("");
  if (seen.has(out) && seen.get(out) !== key) throw new Error(`Collision d'identifiant ${key}`);
  seen.set(out, key);
  return out;
}

/* -------------------------------------------- */
/*  Markdown                                    */
/* -------------------------------------------- */

const LINES = SOURCE.split("\n");
const HEADINGS = LINES.map((l, i) => {
  const m = /^(#{1,6})\s+(.*)$/.exec(l);
  return m ? { level: m[1].length, title: m[2].trim(), line: i } : null;
}).filter(Boolean);

/** Contenu Markdown d'une section (sans son titre), sous-sections comprises. */
function section(title) {
  const h = HEADINGS.find(x => x.title === title);
  if (!h) throw new Error(`Section introuvable : ${title}`);
  const next = HEADINGS.find(x => x.line > h.line && x.level <= h.level);
  return LINES.slice(h.line + 1, next ? next.line : LINES.length).join("\n").trim();
}

/** Remonte les titres d'un cran (### → ##) pour l'intérieur d'une page de journal. */
const promote = md => md.replace(/^(#{3,6})\s/gm, (_, h) => `${h.slice(1)} `);

/** Encadre chaque « Texte à lire » pour l'afficher comme un encart à lire à voix haute. */
function readAloud(md) {
  return md.replace(/^(#{2,6}) Texte à lire\n+((?:(?!#).+\n?)+)/gm, (_, h, body) =>
    `${h} Texte à lire\n\n<div class="lanternes-read">\n\n${body.trim()}\n\n</div>\n\n`);
}

const LINKS = { handouts: {}, scenes: {} };
/** Liens Foundry vers les aides (A01–A06) et les scènes (S01–S05), hors titres. */
function enrich(md) {
  return md.split("\n").map(line => {
    if (/^#/.test(line)) return line;
    return line
      .replace(/\b(A0[1-6])\b/g, (m) => LINKS.handouts[m] ? `@UUID[JournalEntry.${LINKS.handouts[m]}]{${m}}` : m)
      .replace(/\b(S0[1-5])\b/g, (m) => LINKS.scenes[m] ? `@UUID[Scene.${LINKS.scenes[m]}]{${m}}` : m);
  }).join("\n");
}

const html = md => marked.parse(md, { gfm: true }).trim();

/* -------------------------------------------- */
/*  Système installé                            */
/* -------------------------------------------- */

const system = systemManifest();
if (system.version !== "1.2.1") console.warn(`Attention : hogwarts-system ${system.version} installé, références contrôlées sur 1.2.1.`);
const PACKS = { "hogwarts-spells": await readPack("hogwarts-spells"), "hogwarts-potions": await readPack("hogwarts-potions") };
const REF_STATUS = COMPENDIUM_REFS.map(([pack, label, docId]) => {
  const doc = PACKS[pack].get(docId);
  return { pack, label, docId, uuid: `Compendium.hogwarts-system.${pack}.Item.${docId}`, found: !!doc, name: doc?.name, doc };
});
const missing = REF_STATUS.filter(r => !r.found);
if (missing.length) throw new Error(`Références absentes du système installé : ${missing.map(r => r.docId).join(", ")}`);
const spellDoc = docId => PACKS["hogwarts-spells"].get(docId);

/* -------------------------------------------- */
/*  Dossiers                                    */
/* -------------------------------------------- */

const TITLE = "La Nuit des lanternes indociles";
const COLOR = "#7a4a1e";
const folders = [];
function folder(key, type, name, parent = null, sort = 0, color = COLOR) {
  const _id = id(`folder:${key}`);
  folders.push({ _id, name, type, folder: parent, sorting: "m", sort, color, description: "", flags: { [MID]: { key } }, _stats: STATS });
  return _id;
}
const F = {};
F.actors = folder("actors", "Actor", TITLE);
F.pcs = folder("pcs", "Actor", "Personnages joueurs", F.actors, 100);
F.npcs = folder("npcs", "Actor", "Personnages non joueurs", F.actors, 200);
F.journal = folder("journal", "JournalEntry", TITLE);
F.adventure = folder("adventure", "JournalEntry", "Aventure", F.journal, 100);
F.sheets = folder("sheets", "JournalEntry", "Fiches joueurs", F.journal, 200);
F.handouts = folder("handouts", "JournalEntry", "Aides", F.journal, 300);
F.scenes = folder("scenes", "Scene", `${TITLE} — Scènes`);
F.items = folder("items", "Item", `${TITLE} — Objets de scénario`);
F.macros = folder("macros", "Macro", TITLE);
F.playlists = folder("playlists", "Playlist", TITLE);

/* -------------------------------------------- */
/*  Identifiants connus d'avance (liens)        */
/* -------------------------------------------- */

const HANDOUTS = [
  ["A01", "A01 Invitation au concours", "Invitation au concours"],
  ["A02", "A02 Procédure affichée dans l’atelier", "Procédure affichée dans l’atelier"],
  ["A03", "A03 Carnet de Basile", "Carnet de Basile"],
  ["A04", "A04 Reçu de prêt", "Reçu de prêt"],
  ["A05", "A05 Les mots de Basile", "Les mots de Basile"],
  ["A06", "A06 Annonce de fin", "Annonce de fin"],
];
for (const [code] of HANDOUTS) LINKS.handouts[code] = id(`journal:handout:${code}`);
for (const code of Object.keys(MAPS)) LINKS.scenes[code] = id(`scene:${code}`);
const ACTOR_IDS = Object.fromEntries([...PCS, ...NPCS, STAG].map(a => [a.key, id(`actor:${a.key}`)]));
const GUIDE_ID = id("journal:guide");
const TECH_ID = id("journal:tech");
const pageId = key => id(`page:${key}`);
const actorLink = (key, label) => `@UUID[Actor.${ACTOR_IDS[key]}]{${label}}`;
const guideLink = (key, label) => `@UUID[JournalEntry.${GUIDE_ID}.JournalEntryPage.${pageId(`guide:${key}`)}]{${label}}`;
const sceneLink = code => `@UUID[Scene.${LINKS.scenes[code]}]{${MAPS[code].name}}`;
const handoutLink = code => `@UUID[JournalEntry.${LINKS.handouts[code]}]{${HANDOUTS.find(h => h[0] === code)[1].replace(/^A0\d /, `${code} — `)}}`;
const action = (name, label) => `@Lanternes[${name}]{${label}}`;

/* -------------------------------------------- */
/*  Journaux                                    */
/* -------------------------------------------- */

const textPage = (key, name, content, sort, extra = {}) => ({
  _id: pageId(key), name, type: "text", sort, title: { show: true, level: 1 },
  text: { format: 1, content }, ownership: { default: -1 }, flags: { [MID]: { key } }, ...extra,
});
const imagePage = (key, name, src, caption, sort) => ({
  _id: pageId(key), name, type: "image", sort, title: { show: true, level: 1 },
  src, image: { caption }, ownership: { default: -1 }, flags: { [MID]: { key } },
});
const journal = [];
function entry(key, _id, name, folderId, pages, { sort = 0, ownership = { default: OWN.NONE } } = {}) {
  journal.push({ _id, name, folder: folderId, sort, ownership, pages, categories: [], flags: { [MID]: { key } }, _stats: STATS });
}
const quick = parts => `<p class="lanternes-links">${parts.filter(Boolean).join(" · ")}</p>`;

// Introduction : paragraphes d'en-tête du scénario.
const intro = section("Scénario français pour Harry Potter JdR");

const prepList = `<ol>
<li>Lire ${guideLink("verite", "la vérité")}, les quatre scènes principales et ${guideLink("scene4", "le finale")}.</li>
<li>Distribuer les cinq ${"fiches joueurs"} (dossier <em>Fiches joueurs</em>) : chaque fiche ne contient que ce que son personnage sait.</li>
<li>Préparer les aides ${handoutLink("A01")}, ${handoutLink("A02")}, ${handoutLink("A06")} ; garder ${handoutLink("A03")}, ${handoutLink("A04")} et ${handoutLink("A05")} cachées jusqu'au moment prévu.</li>
<li>Ouvrir le ${action("panel", "panneau du défi")} : la jauge de surchauffe (0 à 8) y est visible des joueurs.</li>
<li>Noter les trois opérations finales : <strong>refroidir</strong>, <strong>isoler</strong>, <strong>désenchanter</strong>.</li>
</ol>`;

const startPage = `
<p><strong>Un one shot de 4 à 5 heures pour cinq élèves de troisième année</strong> (Poudlard, 31 octobre 1988). Enquête, magie pratique, rivalité scolaire et sauvetage pendant une fête d’Halloween.</p>
<h2>Lancer la partie</h2>
<ol>
<li>Activez la scène ${sceneLink("S01")} quand la table est prête. Elle est importée inactive, avec les cinq prétirés près de la table des lucioles.</li>
<li>Attribuez chaque prétiré à son joueur (fiche de l'acteur → <em>Configurer les droits</em>) et partagez-lui la fiche joueur correspondante. Rien n'est attribué automatiquement.</li>
<li>Ouvrez le ${action("panel", "panneau du défi")} et, si vous le souhaitez, ${action("tracker-all", "affichez le suivi aux joueurs")} : ils verront la jauge, les trois opérations et les conclusions que vous choisirez de partager.</li>
<li>Montrez les aides depuis le panneau (bouton <em>Montrer</em>) au moment prévu par le scénario.</li>
</ol>
<h2>Préparation en quinze minutes</h2>
${prepList}
<h2>Fil de la partie</h2>
<table><thead><tr><th>Séquence</th><th>Scène</th><th>Page du guide</th></tr></thead><tbody>
<tr><td>Choix des personnages et liens (15 min)</td><td>—</td><td>${guideLink("pretires", "Les cinq prétirés")}</td></tr>
<tr><td>Scène 1 et incident (35 min)</td><td>${sceneLink("S01")}</td><td>${guideLink("scene1", "Scène 1")}</td></tr>
<tr><td>Scène 2 dans l’atelier (35 min)</td><td>${sceneLink("S02")}</td><td>${guideLink("scene2", "Scène 2")}</td></tr>
<tr><td>Première piste et seconde piste facultative (60 à 80 min)</td><td>${sceneLink("S03")}<br>${sceneLink("S04")}</td><td>${guideLink("scene3a", "Scène 3A")} · ${guideLink("scene3b", "Scène 3B")}</td></tr>
<tr><td>Finale (40 à 50 min)</td><td>${sceneLink("S05")}</td><td>${guideLink("scene4", "Scène 4")}</td></tr>
<tr><td>Épilogue (20 à 30 min)</td><td>—</td><td>${guideLink("denouements", "Dénouements")}</td></tr>
</tbody></table>
<h2>Outils du module</h2>
<ul>
<li>${action("panel", "Panneau du défi")} : surchauffe, étapes de l'enquête, accessoires, opérations du finale, conclusions partagées, issue, aides, états des cartes et points de maison. Chaque bouton n'applique que le changement annoncé ; tous les compteurs restent corrigeables.</li>
<li>Macros du dossier <em>${TITLE}</em> : panneau, suivi des joueurs, guide, import.</li>
<li>Playlist <em>Lanternes — ambiances</em> : quatre ambiances originales et discrètes, à lancer, régler et couper depuis l'onglet Playlists.</li>
<li>${action("import", "Importer ou réimporter l'aventure")} : réutiliser l'existant ou créer une nouvelle copie, sans aucune suppression.</li>
<li>Le ${`@UUID[JournalEntry.${TECH_ID}]{journal technique}`} détaille les choix d'adaptation et le rapport du dernier import.</li>
</ul>
<p class="lanternes-note">Le panneau est facultatif : toutes les règles sont dans ce guide.</p>`;

const sceneQuick = {
  scene1: quick([sceneLink("S01"), actorLink("wren", "Agathe Wren"), actorLink("maelle", "Maëlle Pritchard"), actorLink("basile", "Basile Rook"), actorLink("cerf", "Cerf de bois zélé"), handoutLink("A01"), action("milestone-incident", "Incident : +1 surchauffe")]),
  scene2: quick([sceneLink("S02"), handoutLink("A02"), handoutLink("A03"), action("milestone-atelier", "Sortie de l'atelier : +1 surchauffe")]),
  scene3a: quick([sceneLink("S03"), actorLink("maelle", "Maëlle Pritchard"), handoutLink("A04"), action("cooler", "Refroidisseur obtenu"), action("milestone-serre", "Piste résolue : +1 surchauffe")]),
  scene3b: quick([sceneLink("S04"), actorLink("basile", "Basile Rook"), actorLink("cerf", "Cerf de bois zélé"), handoutLink("A05"), action("flange", "Bride obtenue"), action("milestone-coursive", "Piste résolue : +1 surchauffe")]),
  scene4: quick([sceneLink("S05"), actorLink("wren", "Agathe Wren"), action("finale", "Commencer le finale"), action("panel", "Panneau du défi")]),
  denouements: quick([handoutLink("A06"), action("housepoints", "Points de maison (confirmation)")]),
};

const gmPage = (key, name, md, sort, prefix = "") => textPage(`guide:${key}`, name,
  `${prefix}${html(enrich(promote(readAloud(md))))}`, sort);

const pretiresGM = ["Convention des profils", "Caractéristiques adultes à stocker", "Valeurs actuelles et dérivées",
  "Compétences générales finales en pourcentage", "Compétences scolaires finales en pourcentage", "Sortilèges connus", "Équipement commun"]
  .map(t => `### ${t}\n\n${section(t)}`).join("\n\n");
const pcLinks = quick(PCS.map(p => actorLink(p.key, p.name)));

const guidePages = [
  textPage("guide:start", "Démarrage rapide", startPage, 100),
  gmPage("presentation", "Présentation", `${intro}\n\n## Présentation sans révélations\n\n${section("Présentation sans révélations")}`, 200),
  gmPage("verite", "Guide rapide du MJ", section("Guide rapide pour le maître du jeu"), 300),
  gmPage("principes", "Principes de résolution", section("Principes de résolution"), 400, quick([action("panel", "Jauge de surchauffe")])),
  gmPage("pnj", "Personnages non joueurs", section("Les personnages non joueurs"), 500, quick([actorLink("wren", "Agathe Wren"), actorLink("basile", "Basile Rook"), actorLink("maelle", "Maëlle Pritchard")])),
  gmPage("scene1", "Scène 1 — Le concours avant la catastrophe", section("Scène 1 Le concours avant la catastrophe"), 600, sceneQuick.scene1),
  gmPage("scene2", "Scène 2 — Dans l’atelier des lanternes", section("Scène 2 Dans l’atelier des lanternes"), 700, sceneQuick.scene2),
  gmPage("scene3a", "Scène 3A — La serre basse", section("Scène 3A La serre basse"), 800, sceneQuick.scene3a),
  gmPage("scene3b", "Scène 3B — Le passage technique et l’aveu", section("Scène 3B Le passage technique et l’aveu"), 900, sceneQuick.scene3b),
  gmPage("indices", "Tableau des indices", section("Tableau des indices"), 1000, quick([action("panel", "Partager une conclusion depuis le panneau")])),
  gmPage("scene4", "Scène 4 — Le phénix de cuivre", section("Scène 4 Le phénix de cuivre"), 1100, sceneQuick.scene4),
  gmPage("denouements", "Dénouements", section("Dénouements"), 1200, sceneQuick.denouements),
  gmPage("adversaires", "Adversaires et obstacles", section("Adversaires et obstacles"), 1300, quick([actorLink("cerf", "Cerf de bois zélé")])),
  gmPage("pretires", "Les cinq prétirés (vue MJ)", pretiresGM, 1400, pcLinks),
  gmPage("plans", "Plans des scènes", `Les cartes du module suivent ces consignes (1 case = 1 mètre, sans grille dessinée). Les deux états de la cour et l'état éteint de la chambre se basculent depuis le ${action("panel", "panneau du défi")}.\n\n${section("Plans pour la future adaptation Foundry").replace(/^Les dimensions suivantes.*$/m, "")}`, 1500,
    quick(Object.keys(MAPS).map(sceneLink))),
  gmPage("coherence", "Contrôle de cohérence avant de jouer", section("Contrôle de cohérence avant de jouer"), 1600),
  gmPage("credits", "Crédits et périmètre", `${section("Références de règles et périmètre").split("\n").filter(l => !/Ce dossier est un scénario/.test(l)).join("\n")}\n\nLes illustrations définitives ont été créées avec l’outil intégré image_gen, puis assemblées par programme. Les cartes conservent leur géométrie d’origine ; les aides gardent des textes composés par programme. Sources et prompts : \`tools/artwork/\` et \`tools/art-prompts.json\` dans le dépôt. Les ambiances sonores sont des créations originales générées par programme avec \`tools/audio.mjs\`.`, 1700),
];
entry("guide", GUIDE_ID, `${TITLE} — Guide du MJ`, F.adventure, guidePages, { sort: 100 });

// Journal technique.
const creationRows = PCS.map(p => {
  const { generalSpent, schoolSpent } = pcSkills(p.key);
  return `<tr><td>${actorLink(p.key, p.name)}</td><td>${generalSpent}</td><td>${schoolSpent}</td><td>${generalSpent + schoolSpent}</td><td><strong>${generalSpent + schoolSpent}</strong></td></tr>`;
}).join("");
const refRows = REF_STATUS.map(r => `<tr><td>${r.label}</td><td><code>${r.pack}</code></td><td>@UUID[${r.uuid}]{${r.name}}</td><td><code>${r.uuid}</code></td></tr>`).join("");
const techPages = [
  textPage("tech:module", "Ce que fait le module", `
<p>Le module ne modifie aucun fichier du système, aucun réglage de règles et aucun contenu existant. Tout passe par une action explicite du MJ :</p>
<ul>
<li><strong>Import</strong> : copie le contenu du compendium <em>${TITLE} — aventure</em> dans le monde (document Adventure natif de Foundry v14). Les scènes restent inactives, les prétirés sans propriétaire, les journaux et aides non partagés (droits « Aucun » pour les joueurs).</li>
<li><strong>Réimport</strong> : choix entre <em>réutiliser</em> (les documents déjà présents sont conservés tels quels, seuls les manquants sont recréés) et <em>nouvelle copie</em> (nouveaux identifiants, dossiers suffixés, liens internes réécrits vers la copie). Aucune suppression.</li>
<li><strong>Sorts et potion</strong> : après import, les sorts et la dose d'Essence de Murlap sont copiés depuis les compendiums installés du système (<code>hogwarts-spells</code>, <code>hogwarts-potions</code>) dans les inventaires, avec leur origine conservée (<code>_stats.compendiumSource</code>). Le module ne publie aucun compendium de sorts concurrent. Un document introuvable est signalé dans le rapport d'import ci-dessous, sans remplacement silencieux.</li>
<li><strong>Panneau du défi</strong> : l'état est un réglage de monde que seul le client MJ qui clique modifie ; les joueurs reçoivent une vue en lecture seule, sans secret.</li>
<li><strong>Points de maison</strong> : modifiés seulement après une boîte de confirmation, via le réglage <code>hogwarts-system.housePoints</code> du système.</li>
</ul>`, 100),
  textPage("tech:points", "Comptabilité des prétirés", `
<p>Chaque prétiré consomme <strong>exactement 400 points</strong> au-dessus des bases des compétences générales (aucun ajout supérieur à 50, aucun dépassement de plafond). Les compétences scolaires sont un <strong>instantané de scolarité</strong> séparé (troisième année, plafond automatique 60 %).</p>
<p>Le système additionne tous les <code>spent</code> dans <em>Points de création dépensés</em>, matières scolaires comprises (sauf si le réglage <em>excludeSchoolSkillsFromCP</em> est activé). Pour ne pas afficher un faux déficit, chaque prétiré porte un <strong>plafond local d'affichage</strong> (<code>system.experience.creationPoints.max</code>) égal à 400 + son instantané scolaire. Ce plafond n'est qu'un affichage : aucune compétence n'a été rééquilibrée et aucun réglage de monde n'est modifié. La même séparation est conservée dans les drapeaux de l'acteur (<code>flags.${MID}.points</code>).</p>
<table><thead><tr><th>Prétiré</th><th>Points initiaux (généraux)</th><th>Instantané scolaire</th><th>Total des <code>spent</code></th><th>Plafond local d'affichage</th></tr></thead><tbody>${creationRows}</tbody></table>
<p>Si le réglage du système exclut les matières scolaires, le compteur affiche 400 sur un plafond plus élevé : c'est un excédent apparent, jamais un déficit.</p>
<h2>Âge et caractéristiques</h2>
<p>Les caractéristiques adultes sont stockées dans <code>system.stats.&lt;clé&gt;.value</code> ; le système retire lui-même le malus d'âge (16 − âge) à FOR, CON et TAI. Les prétirés ont 13 ans (−3). Basile (15 ans) stocke 10/11/11 et Maëlle (14 ans) 11/12/12 pour retrouver leurs valeurs actuelles. PV attendus : Alix 13, Noor 9, Malo 12, Iris 9, Tom 8 ; Basile 9 sur 10 ; Maëlle 10 ; Wren 12 ; cerf 5.</p>
<h2>Spécialisations</h2>
<p>« Connaissance Atelier et sécurité », « Langue étrangère Français » et « Langue natale Anglais » sont stockées dans le champ <code>spec</code> des presets <em>Connaissance (...)</em>, <em>Langue étrangère (...)</em> et <em>Langue natale</em>, sans ligne en doublon. Le Dressage/Soin 40 de Maëlle utilise un plafond manuel (<code>maxOverride</code>), comme toutes les valeurs finales des PNJ.</p>`, 200),
  textPage("tech:refs", "Références des compendiums", `
<p>Références contrôlées au build contre le système installé (hogwarts-system ${system.version}). Le module les résout de nouveau dans le monde au moment de l'import.</p>
<table><thead><tr><th>Objet</th><th>Compendium</th><th>Lien</th><th>UUID</th></tr></thead><tbody>${refRows}</tbody></table>`, 300),
  textPage("tech:report", "Rapport d'import", `<p>Aucun import n'a encore été effectué dans ce monde. Le rapport est réécrit à chaque import.</p>`, 400),
];
entry("tech", TECH_ID, `${TITLE} — Journal technique`, F.adventure, techPages, { sort: 200 });

// Aides A01–A06.
HANDOUTS.forEach(([code, title, short], i) => {
  // Seul le texte entre guillemets est remis aux joueurs ; les notes de MJ restent dans le guide.
  const md = section(title).split(/\n{2,}/).filter(p => p.trim().startsWith("«")).join("\n\n");
  const pages = [textPage(`handout:${code}`, `${code} — ${short}`, `<div class="lanternes-handout lanternes-${code.toLowerCase()}">${html(md)}</div>`, 100)];
  if (code === "A02") pages.push(imagePage(`handout:${code}:img`, "Schéma d'arrêt local", A("handouts/a02-schema.webp"), "Flocon, mâchoire, cercle ouvert : les trois postes de la procédure d'arrêt.", 200));
  if (code === "A03") pages.push(imagePage(`handout:${code}:img`, "Croquis en marge", A("handouts/a03-croquis.webp"), "Deux encoches face à face ; le loquet se ferme vers l'intérieur.", 200));
  entry(`handout:${code}`, LINKS.handouts[code], `${code} — ${short}`, F.handouts, pages, { sort: (i + 1) * 100 });
});

/* -------------------------------------------- */
/*  Fiches joueurs                              */
/* -------------------------------------------- */

const SKILL_LABEL = s => (s.spec ? `${s.name.replace(" (...)", "")} (${s.spec})` : s.name);
const STAT_LABELS = { str: "FOR", con: "CON", siz: "TAI", dex: "DEX", int: "INT", pow: "POU", app: "APP", per: "PER" };

function playerSheet(pc) {
  const md = section(pc.name);
  const { skills } = pcSkills(pc.key);
  const stats = pcStats(pc.key);
  const exp = EXPECTED[pc.key];
  const statRow = Object.entries(stats).map(([k, v]) => {
    const current = ["str", "con", "siz"].includes(k) ? v.value - 3 : v.value;
    return `<td>${current}</td>`;
  }).join("");
  const general = skills.filter(s => s.category === "general" && s.value > 0).map(s => `${SKILL_LABEL(s)} ${s.value} %`).join(" ; ");
  const school = skills.filter(s => s.category === "school" && s.value > 0).map(s => `${s.name} ${s.value} %`).join(" ; ");
  const spellRows = [...SPELLS.common, ...SPELLS[pc.key]].map(sid => {
    const doc = spellDoc(sid);
    const skillName = { E: "Enchantements", M: "Métamorphose", S: "Mauvais sorts" }[doc.system.spellType];
    const skill = skills.find(s => s.name === skillName);
    const chance = skill ? Math.max(0, skill.value + (doc.system.malus ?? 0)) : "—";
    return `<tr><td>@UUID[Compendium.hogwarts-system.hogwarts-spells.Item.${sid}]{${doc.name}}</td><td>${skillName ?? "—"}</td><td>${doc.system.malus ?? 0}</td><td><strong>${chance} %</strong></td></tr>`;
  }).join("");
  const rules = `
<h2>Règles utiles</h2>
<p><strong>${pc.houseLabel}</strong> · troisième année · 13 ans · ${pc.bloodLabel}. ${exp.hp} PV · bonus aux dégâts ${exp.dmg === "—" ? "aucun" : exp.dmg} · initiative 1d6+${exp.init} · Idée ${exp.idea} % · Chance ${exp.luck} % · mouvement 8 m · 1 point de fougue (max 5).</p>
<table><thead><tr>${Object.values(STAT_LABELS).map(l => `<th>${l}</th>`).join("")}</tr></thead><tbody><tr>${statRow}</tr></tbody></table>
<p><strong>Compétences générales :</strong> ${general}.</p>
<p><strong>Matières scolaires :</strong> ${school}.</p>
<h3>Sortilèges connus</h3>
<table><thead><tr><th>Sort</th><th>Compétence</th><th>Malus</th><th>Chance</th></tr></thead><tbody>${spellRows}</tbody></table>
<h3>Équipement</h3>
<p>Baguette (${pc.wand.wood.toLowerCase()}, ${pc.wand.core.toLowerCase()}, ${pc.wand.length}, sans bonus), robe scolaire, sac, parchemin, plume, une dose d'Essence de Murlap (rend 1 PV), ${pc.gear.map(g => g.toLowerCase()).join(", ")}.</p>
<h3>Agir</h3>
<ul>
<li>Décrire précisément ce que l'on cherche suffit souvent ; un jet réussi apporte une précision, du temps gagné ou un avantage.</li>
<li>On ne recommence pas le même jet à l'identique : changez d'outil, de méthode ou de situation.</li>
<li>Un bonus de +10 ou +20 proposé par le MJ se saisit dans la fenêtre de jet.</li>
<li>Les solutions matérielles comptent : levier, corde, pince isolée, plusieurs bras, une preuve et une promesse crédible.</li>
</ul>`;
  return textPage(`sheet:${pc.key}`, pc.name, `${html(promote(md))}${rules}`, 100);
}
PCS.forEach((pc, i) => entry(`sheet:${pc.key}`, id(`journal:sheet:${pc.key}`), `Fiche joueur — ${pc.name}`, F.sheets, [playerSheet(pc)], { sort: (i + 1) * 100 }));

/* -------------------------------------------- */
/*  Acteurs                                     */
/* -------------------------------------------- */

const actors = [];
function protoToken(key, name, { link = true, disposition = 1 } = {}) {
  return {
    name, actorLink: link, disposition, width: 1, height: 1,
    texture: { src: A(`tokens/${key}.webp`) },
    displayName: 20, displayBars: 20, bar1: { attribute: "health" }, bar2: { attribute: null },
    sight: { enabled: false },
  };
}
function gearItem(owner, name, description, i) {
  return {
    _id: id(`item:${owner}:${name}`), name, type: "gear", img: "icons/svg/item-bag.svg", sort: (i + 1) * 100,
    system: { description, quantity: 1, weight: 0 }, flags: { [MID]: { key: `${owner}:gear` } }, _stats: STATS,
  };
}

/** Bloc d'un personnage dans le Markdown, découpé en paragraphes. */
function pcParagraphs(name) {
  return section(name).split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
}

PCS.forEach((pc, i) => {
  const paras = pcParagraphs(pc.name);
  const find = re => paras.find(p => re.test(p)) ?? "";
  const description = paras[0] ?? "";
  const toRead = find(/^\*\*À lire au joueur\.\*\*/);
  const objective = find(/^\*\*Objectif personnel/);
  const moment = find(/^\*\*Moment privilégié/);
  const phrase = /\*\*Phrase :\*\*\s*(.+)$/.exec(moment)?.[1] ?? "";
  const { skills, generalSpent, schoolSpent } = pcSkills(pc.key);
  actors.push({
    _id: ACTOR_IDS[pc.key], name: pc.name, type: "character", img: A(`portraits/${pc.key}.webp`), folder: F.pcs, sort: (i + 1) * 100,
    ownership: { default: OWN.NONE },
    prototypeToken: protoToken(pc.key, pc.name, { disposition: 1 }),
    system: {
      health: { value: EXPECTED[pc.key].hp, max: EXPECTED[pc.key].hp },
      healthNonLethal: { value: 0, max: EXPECTED[pc.key].hp },
      profile: { year: 3, house: pc.house, age: 13, archetype: pc.archetype },
      fougue: { value: 1, max: 5 }, stress: { value: 0 }, movement: 8,
      stats: pcStats(pc.key), skills,
      information: { bloodStatus: pc.blood, gender: pc.gender, origin: "", patronus: "" },
      character: { favoriteExpression: phrase.replace(/^«\s*|\s*»$/g, "") },
      bio: { history: html(`${description}\n\n${toRead}`), motivation: html(objective) },
      experience: { creationPoints: { max: generalSpent + schoolSpent, spent: generalSpent + schoolSpent }, personalBonusPoints: { max: 6, spent: 0 } },
      wand: { ...pc.wand, flexibility: "", affinity: "", pbpCost: 0, description: "Fonctionnelle et personnelle, sans bonus d’affinité pour cette séance." },
    },
    items: [
      gearItem(pc.key, "Fournitures scolaires", "<p>Robe scolaire, sac, parchemin et plume.</p>", 0),
      ...pc.gear.map((g, j) => gearItem(pc.key, g, "<p>Matériel distinctif, sans bonus mécanique.</p>", j + 1)),
    ],
    effects: [],
    flags: { [MID]: { key: pc.key, spells: [...SPELLS.common, ...SPELLS[pc.key]], potions: [["poEssencedeMurla", 1]], points: { initial: generalSpent, school: schoolSpent, displayCap: generalSpent + schoolSpent } } },
    _stats: STATS,
  });
});

const npcText = {
  wren: section("Agathe Wren"), basile: section("Basile Rook"), maelle: section("Maëlle Pritchard"),
};
NPCS.forEach((npc, i) => {
  actors.push({
    _id: ACTOR_IDS[npc.key], name: npc.name, type: "npc", img: A(`portraits/${npc.key}.webp`), folder: F.npcs, sort: (i + 1) * 100,
    ownership: { default: OWN.NONE },
    prototypeToken: protoToken(npc.key, npc.name, { disposition: 0 }),
    system: {
      health: { value: npc.hp, max: npc.key === "basile" ? 10 : npc.hp },
      healthNonLethal: { value: 0, max: npc.key === "basile" ? 10 : npc.hp },
      profile: { year: npc.year, house: npc.house, age: npc.age, archetype: "", role: npc.role },
      stats: Object.fromEntries(Object.entries(npc.stats).map(([k, v]) => [k, { value: v }])),
      skills: npcSkills(npc), information: { bloodStatus: npc.blood }, movement: 8, armor: 0, damage: "1d3",
      biography: html(npcText[npc.key]),
      notes: { gmNotes: "<p>Valeurs finales de PNJ définies pour l’aventure (plafonds manuels).</p>" },
    },
    items: [],
    effects: [],
    flags: { [MID]: { key: npc.key, spells: npc.spells, potions: [] } },
    _stats: STATS,
  });
});

actors.push({
  _id: ACTOR_IDS.cerf, name: STAG.name, type: "creature", img: A("portraits/cerf.webp"), folder: F.npcs, sort: 400,
  ownership: { default: OWN.NONE },
  prototypeToken: protoToken("cerf", STAG.name, { link: false, disposition: -1 }),
  system: {
    health: { value: STAG.hp, max: STAG.hp }, healthNonLethal: { value: 0, max: STAG.hp },
    classification: "X",
    stats: Object.fromEntries(Object.entries(STAG.stats).map(([k, v]) => [k, { value: v, formula: "" }])),
    movement: { land: STAG.movement, fly: null, swim: null }, armor: { value: 0, label: "" },
    attacks: STAG.attacks, skills: STAG.skills,
    biography: "<p>Automate original de cette aventure, haut de 90 cm. Ce n’est pas une espèce du bestiaire.</p>",
    powers: html(section("Cerf de bois zélé").split("\n").filter(l => !l.startsWith("|")).join("\n")),
    usage: "<p>Un ordre de Wren ou l’isolation du cœur le désactive. Maximum conseillé : un cerf actif dans une confrontation.</p>",
    notes: { gmNotes: "<p>Choisir explicitement le non létal pour son attaque contre les personnes.</p>" },
  },
  items: [], effects: [],
  flags: { [MID]: { key: "cerf" } },
  _stats: STATS,
});

/* -------------------------------------------- */
/*  Objets de scénario                          */
/* -------------------------------------------- */

const items = [
  {
    _id: id("item:bride"), name: "Bride de sécurité", type: "gear", img: A("items/bride.webp"), folder: F.items, sort: 100,
    system: { quantity: 1, weight: 1, description: "<p><strong>Objet de scénario</strong> (création originale), sans bonus permanent. Pièce en forme de mâchoire retirée par Basile.</p><p><strong>Dans cette aventure seulement :</strong> poser la bride donne automatiquement une des deux progressions de l’opération <em>Isoler</em>. Celui qui la pose peut expliquer la manœuvre à un camarade sans jet.</p>" },
    flags: { [MID]: { key: "bride" } }, _stats: STATS,
  },
  {
    _id: id("item:refroidisseur"), name: "Refroidisseur portatif", type: "gear", img: A("items/refroidisseur.webp"), folder: F.items, sort: 200,
    system: { quantity: 1, weight: 3, description: "<p><strong>Objet de scénario</strong> (création originale), sans bonus permanent. Cylindre de verre entouré de cuivre, prêté par Wren à Maëlle.</p><p><strong>Dans cette aventure seulement :</strong> le brancher donne automatiquement une des deux progressions de l’opération <em>Refroidir</em> et +10 au jet restant de cette opération.</p>" },
    flags: { [MID]: { key: "refroidisseur" } }, _stats: STATS,
  },
];

/* -------------------------------------------- */
/*  Scènes                                      */
/* -------------------------------------------- */

const SCENE_NOTES = {
  S01: { scene1: ["scene1", "Scène 1 — l'incident"] },
  S02: { carnet: ["scene2", "Carnet A03"], panneau: ["scene2", "Panneau A02"], raccord: ["scene2", "Conduite et bague"], ratelier: ["scene2", "Râtelier"] },
  S03: { refroidisseur: ["scene3a", "Refroidisseur"], pots: ["scene3a", "Pots fragiles"] },
  S04: { basile: ["scene3b", "Basile"], cerf: ["scene3b", "Cerf zélé"] },
  S05: { refroidir: ["scene4", "Refroidir (flocon)"], isoler: ["scene4", "Isoler (mâchoire)"], desenchanter: ["scene4", "Désenchanter (cercle ouvert)"], vanne: ["scene4", "Vanne de Wren"] },
};
const SCENE_PAGE = { S01: "scene1", S02: "scene2", S03: "scene3a", S04: "scene3b", S05: "scene4" };
const tokenFor = (key, x, y, levelId, code) => {
  const actorKey = key.startsWith("cerf") ? "cerf" : key;
  const a = actors.find(x => x.flags[MID].key === actorKey);
  return {
    _id: id(`token:${code}:${key}`), name: a.name, actorId: a._id, actorLink: actorKey !== "cerf",
    x: x * GRID, y: y * GRID, elevation: 0, level: levelId, width: 1, height: 1,
    texture: { src: a.prototypeToken.texture.src }, disposition: a.prototypeToken.disposition,
    displayName: 20, displayBars: 20, bar1: { attribute: "health" }, bar2: { attribute: null },
    sight: { enabled: false }, hidden: false, locked: false, delta: {}, flags: { [MID]: { key } },
  };
};

const scenes = Object.entries(MAPS).map(([code, map], i) => {
  const levelId = id(`level:${code}`);
  const state = map.states[0];
  return {
    _id: LINKS.scenes[code], name: map.name, navName: code, active: false, navigation: true, navOrder: i, folder: F.scenes, sort: (i + 1) * 100,
    width: map.w * GRID, height: map.h * GRID, padding: 0.1, shiftX: 0, shiftY: 0,
    initial: { x: (map.w * GRID) / 2, y: (map.h * GRID) / 2, scale: 0.5 },
    initialLevel: levelId,
    levels: [{
      _id: levelId, name: "Niveau principal", elevation: { bottom: null, top: null },
      background: { color: "#1b1712", src: A(`maps/${map.file}-${state}.webp`), tint: "#ffffff", alphaThreshold: 0.75 },
      foreground: { src: null, tint: "#ffffff", alphaThreshold: 0.75 }, fog: { src: null },
      textures: { anchorX: 0.5, anchorY: 0.5, offsetX: 0, offsetY: 0, fit: "fill", scaleX: 1, scaleY: 1, rotation: 0 },
      sort: 0, flags: {},
    }],
    thumb: A(`maps/thumbs/${map.file}.webp`),
    grid: { type: 1, size: GRID, style: "solidLines", thickness: 1, color: "#000000", alpha: 0.18, distance: 1, units: "m" },
    tokenVision: false,
    environment: { darknessLevel: 0, darknessLock: false, globalLight: { enabled: true } },
    journal: GUIDE_ID, journalEntryPage: pageId(`guide:${SCENE_PAGE[code]}`),
    tokens: Object.entries(map.tokens ?? {}).map(([key, [x, y]]) => tokenFor(key, x, y, levelId, code)),
    notes: Object.entries(SCENE_NOTES[code] ?? {}).map(([key, [page, text]]) => ({
      _id: id(`note:${code}:${key}`), entryId: GUIDE_ID, pageId: pageId(`guide:${page}`),
      x: map.notes[key][0] * GRID + GRID / 2, y: map.notes[key][1] * GRID + GRID / 2, elevation: 0,
      texture: { src: "icons/svg/book.svg", tint: "#ffd27a" }, iconSize: 40, text, fontSize: 32, textAnchor: 1, textColor: "#ffffff", global: false,
      flags: { [MID]: { key } },
    })),
    lights: (map.lights ?? []).map(([x, y, dim, bright, color], j) => ({
      _id: id(`light:${code}:${j}`), x: x * GRID + GRID / 2, y: y * GRID + GRID / 2, elevation: 0, rotation: 0, walls: true, vision: false,
      config: { dim, bright, color, alpha: 0.35, angle: 360, animation: { type: j === 0 ? "torch" : "pulse", speed: 2, intensity: 2 } },
      hidden: false, flags: { [MID]: { key: `light${j}` } },
    })),
    walls: [], drawings: [], tiles: [], sounds: [], regions: [],
    flags: { [MID]: { key: code, states: Object.fromEntries(map.states.map(s => [s, A(`maps/${map.file}-${s}.webp`)])), state } },
    _stats: STATS,
  };
});

/* -------------------------------------------- */
/*  Macros et playlist                          */
/* -------------------------------------------- */

const api = call => `const api = game.modules.get("${MID}")?.api;\nif (!api) return ui.notifications.warn("Activez le module ${TITLE}.");\n${call};`;
const macros = [
  ["panel", "Lanternes · Panneau du défi", "api.panel()", "icons/svg/fire.svg"],
  ["tracker", "Lanternes · Suivi des joueurs", "api.tracker({ broadcast: true })", "icons/svg/eye.svg"],
  ["guide", "Lanternes · Guide du MJ", "api.openGuide()", "icons/svg/book.svg"],
  ["import", "Lanternes · Importer ou réimporter", "api.openImporter()", "icons/svg/download.svg"],
].map(([key, name, call, img], i) => ({
  _id: id(`macro:${key}`), name, type: "script", scope: "global", img, command: api(call), folder: F.macros, sort: (i + 1) * 100,
  ownership: { default: OWN.NONE }, flags: { [MID]: { key } }, _stats: STATS,
}));

const SOUNDS = [
  ["cour", "Cour festive", "Rumeur douce et carillons de lanternes."],
  ["atelier", "Atelier qui cliquette", "Cliquetis réguliers, conduites qui frappent."],
  ["serre", "Serre humide", "Gouttes, souffle tiède, feuilles qui tintent."],
  ["phenix", "Tension du phénix", "Bourdonnement grave et sifflement de vapeur."],
];
const playlists = [{
  _id: id("playlist:ambiances"), name: "Lanternes — ambiances", description: "Ambiances originales générées pour le module. Volume réglable sur chaque piste ; bouton d'arrêt de la playlist.",
  mode: -1, channel: "environment", playing: false, fade: 2000, folder: F.playlists, sort: 100, seed: 1,
  sounds: SOUNDS.map(([key, name, description], j) => ({
    _id: id(`sound:${key}`), name, description, path: A(`audio/${key}.ogg`), channel: "", playing: false, pausedTime: null,
    repeat: true, volume: 0.35, fade: 2000, sort: (j + 1) * 100, flags: { [MID]: { key } },
  })),
  ownership: { default: OWN.NONE }, flags: { [MID]: { key: "ambiances" } }, _stats: STATS,
}];

/* -------------------------------------------- */
/*  Adventure                                   */
/* -------------------------------------------- */

const adventure = {
  _key: `!adventures!${id("adventure")}`,
  _id: id("adventure"),
  name: TITLE,
  img: A("art/cover.webp"),
  caption: "<p>One shot Harry Potter JdR · 4 à 5 heures · cinq élèves de troisième année · Halloween 1988.</p>",
  description: `<p>À Halloween, la cour des anciennes serres accueille une exposition de lanternes enchantées. Cinq élèves de maisons différentes ont fabriqué ensemble une constellation de lucioles de papier. Mais le phénix de cuivre qui doit allumer les lanternes reçoit plus d’énergie qu’il n’en libère…</p>
<p><strong>Contenu :</strong> guide du MJ, journal technique, 5 prétirés et leurs fiches joueurs, 3 PNJ, un automate, 6 aides, 5 scènes, 2 objets de scénario, 4 macros et une playlist d’ambiances. Les sorts et l’Essence de Murlap sont copiés depuis les compendiums du système lors de l’import.</p>
<p>Tout est créé dans des dossiers « ${TITLE} ». Les scènes restent inactives, les prétirés sans propriétaire et les secrets non partagés.</p>`,
  actors, items, journal, scenes, macros, playlists, folders, tables: [], cards: [], combats: [],
  folder: null, sort: 0, flags: { [MID]: { version: MODULE.version } }, _stats: STATS,
};

// Chaque lien @UUID[Type.id] doit pointer vers un document de l'aventure ou du système.
const known = new Set([...actors, ...items, ...journal, ...scenes, ...macros, ...playlists, ...folders].map(d => d._id));
const pagesKnown = new Set(journal.flatMap(j => j.pages.map(p => `${j._id}.JournalEntryPage.${p._id}`)));
const text = JSON.stringify(adventure);
for (const [, ref] of text.matchAll(/@UUID\[([^\]]+)\]/g)) {
  if (ref.startsWith("Compendium.hogwarts-system.")) continue;
  const [, docId, ...rest] = ref.split(".");
  if (!known.has(docId) || (rest.length && !pagesKnown.has([docId, ...rest].join(".")))) throw new Error(`Lien cassé : ${ref}`);
}

const srcDir = path.join(ROOT, "src", "aventure");
fs.rmSync(srcDir, { recursive: true, force: true });
fs.mkdirSync(srcDir, { recursive: true });
fs.writeFileSync(path.join(srcDir, "adventure.json"), JSON.stringify(adventure, null, 2));
const packDir = path.join(ROOT, "packs", "aventure");
fs.rmSync(packDir, { recursive: true, force: true });
await compilePack(srcDir, packDir, { log: false });
console.log(`Aventure construite : ${actors.length} acteurs, ${items.length} objets, ${journal.length} journaux, ${scenes.length} scènes, ${macros.length} macros, ${playlists.length} playlist, ${folders.length} dossiers.`);
