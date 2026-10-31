// Données chiffrées de l'aventure, recopiées des tables du scénario
// (source/La_Nuit_des_Lanternes_Indociles.md). Le build vérifie leur cohérence.

export const MID = "la-nuit-des-lanternes-indociles";

/** Presets du système hogwarts-system 1.2.1 (module/helpers/config.mjs), dans l'ordre de presetSkills(). */
export const SKILL_PRESETS = {
  general: [
    ["Acrobatie/Quidditch", 10, 60], ["Artisanat", 5, 30], ["Athlétisme", 20, 75], ["Bagarre", 10, 50],
    ["Bibliothèque", 15, 75], ["Commandement", 10, 60], ["Connaissance (...)", 10, 50], ["Déguisement", 5, 55],
    ["Discrétion", 10, 60], ["Dressage/Soin", 10, 30], ["Empathie", 20, 75], ["Esquive", 25, 80],
    ["Fouille/Ménage", 20, 80], ["Langue étrangère (...)", 0, 95], ["Langue natale", 70, 95], ["Orientation", 20, 80],
    ["Persuasion/Baratin", 10, 80], ["Psychologie", 5, 70], ["Secourisme", 0, 20], ["Survie", 0, 20],
    ["Triche", 0, 40], ["Vigilance", 20, 75],
  ],
  wizard: [
    ["Connaissance (...) (S)", 0, 50], ["Connaissance des Moldus (S)", 0, 40], ["Culture générale des sorciers (S)", 0, 80],
    ["Jeux sorciers (S)", 0, 80], ["Langue (Latin) (S)", 0, 95], ["Mythes et légendes des sorciers (S)", 0, 75],
  ],
  muggle: [
    ["Bricolage (M)", 0, 50], ["Conduire (M)", 0, 30], ["Connaissance (...) (M)", 0, 50], ["Culture générale Moldue (M)", 0, 80],
    ["Jeux Moldus (M)", 0, 80], ["Langue (Latin) (M)", 0, 95], ["Sérrurerie (M)", 0, 50],
  ],
  school: [
    ["Arithmancie", 0, 95], ["Art magique", 0, 95], ["Art moldu", 0, 95], ["Astronomie", 0, 95], ["Botanique", 0, 95],
    ["Défenses contre les forces du mal", 0, 95], ["Divination", 0, 95], ["Enchantements", 5, 95], ["Etude des Moldus", 0, 95],
    ["Etude des runes", 0, 95], ["Histoire de la magie", 0, 95], ["Mauvais sorts", 0, 95], ["Métamorphose", 0, 95],
    ["Musique magique", 0, 95], ["Musique moldue", 5, 95], ["Potions", 0, 95], ["Soin aux créatures magiques", 0, 95],
    ["Vol en balai", 0, 95],
  ],
  special: [["Alchimie", 0, 95], ["Duels", 0, 95]],
};

/** Spécialisations stockées dans le champ `spec` du preset, jamais en doublon. */
export const SPECS = {
  "Connaissance (...)": "Atelier et sécurité",
  "Langue étrangère (...)": "Français",
  "Langue natale": "Anglais",
};

/** Libellés du scénario → nom du preset. */
const GENERAL_ALIASES = {
  "Connaissance Atelier et sécurité": "Connaissance (...)",
  "Langue étrangère Français": "Langue étrangère (...)",
  "Langue natale Anglais": "Langue natale",
};

const ORDER = ["alix", "noor", "malo", "iris", "tom"];
const row = (...values) => Object.fromEntries(ORDER.map((k, i) => [k, values[i]]));

// Table « Compétences générales finales en pourcentage ».
const GENERAL_TABLE = {
  "Acrobatie/Quidditch": row(20, 20, 60, 20, 20),
  "Artisanat": row(15, 15, 15, 15, 15),
  "Athlétisme": row(70, 30, 70, 30, 30),
  "Bagarre": row(20, 20, 20, 20, 20),
  "Bibliothèque": row(25, 65, 25, 25, 25),
  "Commandement": row(60, 20, 20, 60, 20),
  "Connaissance Atelier et sécurité": row(20, 50, 20, 20, 20),
  "Déguisement": row(15, 15, 15, 55, 15),
  "Discrétion": row(20, 20, 20, 50, 60),
  "Dressage/Soin": row(20, 20, 30, 20, 20),
  "Empathie": row(30, 30, 70, 30, 30),
  "Esquive": row(75, 35, 35, 35, 75),
  "Fouille/Ménage": row(30, 30, 30, 30, 70),
  "Langue étrangère Français": row(10, 10, 10, 10, 10),
  "Langue natale Anglais": row(70, 70, 70, 70, 70),
  "Orientation": row(30, 70, 30, 30, 70),
  "Persuasion/Baratin": row(50, 20, 20, 60, 20),
  "Psychologie": row(15, 55, 15, 55, 15),
  "Secourisme": row(10, 10, 20, 10, 10),
  "Survie": row(10, 10, 20, 10, 10),
  "Triche": row(10, 10, 10, 10, 40),
  "Vigilance": row(70, 70, 70, 30, 30),
};

// Table « Compétences scolaires finales en pourcentage ».
const SCHOOL_TABLE = {
  "Enchantements": row(45, 55, 40, 50, 50),
  "Métamorphose": row(40, 50, 35, 45, 55),
  "Mauvais sorts": row(45, 35, 30, 50, 35),
  "Potions": row(35, 50, 50, 40, 35),
  "Botanique": row(35, 40, 55, 35, 30),
  "Défenses contre les forces du mal": row(45, 40, 35, 40, 40),
  "Histoire de la magie": row(30, 45, 35, 40, 30),
  "Astronomie": row(30, 45, 35, 35, 35),
  "Vol en balai": row(50, 30, 35, 30, 45),
  "Arithmancie": row(0, 15, 0, 0, 0),
  "Divination": row(0, 0, 0, 15, 0),
  "Etude des Moldus": row(15, 0, 0, 0, 0),
  "Etude des runes": row(0, 0, 0, 0, 15),
  "Soin aux créatures magiques": row(0, 0, 15, 0, 0),
  "Art magique": row(0, 0, 0, 0, 0),
  "Art moldu": row(0, 0, 0, 0, 0),
  "Musique magique": row(0, 0, 0, 0, 0),
  "Musique moldue": row(5, 5, 5, 5, 5),
};

// Table « Caractéristiques adultes à stocker ».
const STATS_TABLE = {
  str: row(17, 10, 13, 10, 11),
  con: row(16, 11, 16, 11, 12),
  siz: row(15, 12, 14, 12, 10),
  dex: row(14, 13, 15, 13, 17),
  int: row(12, 17, 12, 16, 15),
  pow: row(13, 16, 11, 14, 14),
  app: row(10, 14, 10, 17, 13),
  per: row(11, 15, 17, 15, 16),
};

/** Valeurs dérivées attendues (table « Valeurs actuelles et dérivées »), contrôlées par le build. */
export const EXPECTED = {
  alix: { hp: 13, dmg: "+1d3", init: 14, idea: 60, luck: 65 },
  noor: { hp: 9, dmg: "—", init: 13, idea: 85, luck: 80 },
  malo: { hp: 12, dmg: "—", init: 15, idea: 60, luck: 55 },
  iris: { hp: 9, dmg: "—", init: 13, idea: 80, luck: 70 },
  tom: { hp: 8, dmg: "—", init: 17, idea: 75, luck: 70 },
};

export const SPELLS = {
  common: ["spLumiereObscuri", "spLevitationdobj", "spSortilegederep", "spSortilegedeau0", "spRefroidissemen"],
  alix: ["spDesarmement000", "spRalentissement", "spLumieresdedetr"],
  noor: ["spRechauffement0", "spRecurage000000", "spLumieresdedetr"],
  malo: ["spAttelle0000000", "spVentilation000", "spRecurage000000"],
  iris: ["spDesarmement000", "spRecurage000000", "spLumieresdedetr"],
  tom: ["spRechauffement0", "spRecurage000000", "spLumieresdedetr"],
  basile: ["spDesarmement000"],
};

/** Références contrôlées du scénario, vérifiées contre le compendium installé par le build. */
export const COMPENDIUM_REFS = [
  ["hogwarts-spells", "Lévitation d’objets", "spLevitationdobj"],
  ["hogwarts-spells", "Lumière/Obscurité", "spLumiereObscuri"],
  ["hogwarts-spells", "Sortilège de réparation", "spSortilegederep"],
  ["hogwarts-spells", "Sortilège d’eau", "spSortilegedeau0"],
  ["hogwarts-spells", "Refroidissement", "spRefroidissemen"],
  ["hogwarts-spells", "Réchauffement", "spRechauffement0"],
  ["hogwarts-spells", "Récurage", "spRecurage000000"],
  ["hogwarts-spells", "Attelle", "spAttelle0000000"],
  ["hogwarts-spells", "Ventilation", "spVentilation000"],
  ["hogwarts-spells", "Désarmement", "spDesarmement000"],
  ["hogwarts-spells", "Ralentissement", "spRalentissement"],
  ["hogwarts-spells", "Lumières de détresse", "spLumieresdedetr"],
  ["hogwarts-potions", "Essence de Murlap", "poEssencedeMurla"],
];

export const PCS = [
  {
    key: "alix", name: "Alix Delcourt", house: "gryffindor", houseLabel: "Gryffondor", archetype: "sportif",
    blood: "halfblood", bloodLabel: "sang-mêlé", gender: "female",
    wand: { wood: "Frêne", core: "Crin de licorne", length: "28 cm" },
    gear: ["Corde de dix mètres", "Gants de vol", "Sifflet"],
  },
  {
    key: "noor", name: "Noor Whitcombe", house: "ravenclaw", houseLabel: "Serdaigle", archetype: "cerebral",
    blood: "muggleborn", bloodLabel: "née-moldue", gender: "female",
    wand: { wood: "Orme", core: "Ventricule de dragon", length: "26 cm" },
    gear: ["Carnet quadrillé", "Craie", "Petite règle pliable"],
  },
  {
    key: "malo", name: "Malo Fenwick", house: "hufflepuff", houseLabel: "Poufsouffle", archetype: "naturaliste",
    blood: "halfblood", bloodLabel: "sang-mêlé", gender: "male",
    wand: { wood: "Saule", core: "Crin de licorne", length: "29 cm" },
    gear: ["Arrosoir", "Foulards de coton", "Ficelle et sachets de graines"],
  },
  {
    key: "iris", name: "Iris Vane", house: "slytherin", houseLabel: "Serpentard", archetype: "manipulateur",
    blood: "pureblood", bloodLabel: "sang-pur", gender: "female",
    wand: { wood: "Noyer", core: "Ventricule de dragon", length: "27 cm" },
    gear: ["Ruban noir", "Miroir de poche ordinaire", "Liste des exposants"],
  },
  {
    key: "tom", name: "Tom Bellamy", house: "gryffindor", houseLabel: "Gryffondor", archetype: "canaille",
    blood: "muggleborn", bloodLabel: "né-moldu", gender: "male",
    wand: { wood: "Noisetier", core: "Crin de licorne", length: "25 cm" },
    gear: ["Tournevis ordinaire", "Boîte de vis", "Petit miroir sur une tige"],
  },
];

/** Compétences complètes d'un prétiré, dans l'ordre des presets. */
export function pcSkills(key) {
  const general = Object.fromEntries(Object.entries(GENERAL_TABLE).map(([label, v]) => [GENERAL_ALIASES[label] ?? label, v[key]]));
  const school = Object.fromEntries(Object.entries(SCHOOL_TABLE).map(([label, v]) => [label, v[key]]));
  const out = [];
  for (const [category, list] of Object.entries(SKILL_PRESETS)) {
    for (const [name, base, max] of list) {
      let final = base;
      if (category === "general") final = general[name] ?? base;
      if (category === "school") final = school[name] ?? base;
      if (final < base) throw new Error(`${key}: ${name} ${final} < base ${base}`);
      // Plafond scolaire automatique de 3e année : 60 (30 + 2 × 15).
      const effMax = category === "school" ? 60 : max;
      if (final > effMax) throw new Error(`${key}: ${name} ${final} > plafond ${effMax}`);
      out.push({
        name, base, max, maxOverride: false, value: final, spent: final - base, category,
        spec: SPECS[name] ?? "", custom: false, xpCheck: false,
      });
    }
  }
  const generalSpent = out.filter(s => s.category === "general").reduce((t, s) => t + s.spent, 0);
  const schoolSpent = out.filter(s => s.category === "school").reduce((t, s) => t + s.spent, 0);
  if (generalSpent !== 400) throw new Error(`${key}: ${generalSpent} points généraux au lieu de 400`);
  for (const s of out) if (s.category === "general" && s.spent > 50) throw new Error(`${key}: ${s.name} +${s.spent} > 50`);
  return { skills: out, generalSpent, schoolSpent };
}

export function pcStats(key) {
  return Object.fromEntries(Object.entries(STATS_TABLE).map(([k, v]) => [k, { value: v[key] }]));
}

/** PNJ : valeurs finales du scénario, posées sur les presets avec un plafond manuel. */
export const NPCS = [
  {
    key: "wren", name: "Agathe Wren", age: 52, year: 7, house: "", role: "Restauratrice d’objets magiques",
    blood: "halfblood",
    stats: { str: 10, con: 12, siz: 12, dex: 11, int: 16, pow: 16, app: 13, per: 13 },
    hp: 12, skills: { "Enchantements": 80, "Métamorphose": 65, "Potions": 70, "Artisanat": 75, "Secourisme": 50 },
    spells: [],
  },
  {
    key: "basile", name: "Basile Rook", age: 15, year: 4, house: "slytherin", role: "Élève de quatrième année, chargé des réglages",
    blood: "halfblood",
    // Valeurs actuelles 9/10/10 : on stocke 10/11/11, le système retire 1 (16 − 15 ans).
    stats: { str: 10, con: 11, siz: 11, dex: 13, int: 14, pow: 12, app: 13, per: 12 },
    hp: 9, skills: { "Persuasion/Baratin": 45, "Discrétion": 40, "Enchantements": 50, "Métamorphose": 40, "Esquive": 40 },
    spells: [...SPELLS.common, ...SPELLS.basile],
  },
  {
    key: "maelle", name: "Maëlle Pritchard", age: 14, year: 4, house: "hufflepuff", role: "Élève de quatrième année, exposante",
    blood: "halfblood",
    // Valeurs actuelles 9/10/10 : on stocke 11/12/12, le système retire 2 (16 − 14 ans).
    stats: { str: 11, con: 12, siz: 12, dex: 12, int: 13, pow: 12, app: 12, per: 15 },
    hp: 10, skills: { "Botanique": 60, "Empathie": 45, "Dressage/Soin": 40, "Enchantements": 35 },
    spells: [],
  },
];

export function npcSkills(npc) {
  const out = [];
  for (const [category, list] of Object.entries(SKILL_PRESETS)) {
    for (const [name, base, max] of list) {
      const final = npc.skills[name] ?? base;
      const custom = name in npc.skills;
      // Valeur finale de PNJ : plafond manuel au moins égal à la valeur (ex. Dressage/Soin 40 de Maëlle).
      const cap = custom ? Math.max(max === 95 ? 95 : max, final) : max;
      out.push({
        name, base, max: cap, maxOverride: custom, value: final, spent: final - base, category,
        spec: "", custom: false, xpCheck: false,
      });
    }
  }
  return out;
}

export const STAG = {
  key: "cerf", name: "Cerf de bois zélé",
  stats: { str: 5, con: 6, siz: 4, dex: 10, int: 3, pow: 6, app: 8, per: 10 },
  hp: 5, movement: 6,
  attacks: [{ name: "Attraper une manche (non létal, manche retenue)", chance: 30, damage: "1" }],
  skills: [{ name: "Esquive", value: 20 }],
};
