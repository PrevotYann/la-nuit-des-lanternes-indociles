// Disposition des cinq plans (en cases de 1 m). Partagée entre le dessin des cartes
// (tools/art.mjs) et le placement des tokens, notes et lumières (tools/build.mjs).

export const GRID = 100;

export const MAPS = {
  S01: {
    name: "S01 — Cour des anciennes serres", file: "s01-cour", states: ["fete", "incident"], w: 24, h: 18,
    exits: { nord: [10, 0, 4, 1], est: [23, 7, 1, 4], ouest: [0, 7, 1, 4], sud: [8, 17, 8, 1] },
    phoenix: [10, 7, 4, 4],
    stands: [
      { id: "courges", rect: [2, 2, 5, 3], label: "Courges chantantes" },
      { id: "poissons", rect: [17, 2, 5, 3], label: "Poissons de papier" },
      { id: "pommes", rect: [18, 12, 4, 3], label: "Pommes caramélisées" },
    ],
    table: [2, 13, 4, 2],
    tokens: {
      alix: [2, 11], noor: [3, 11], malo: [4, 11], iris: [5, 11], tom: [6, 11],
      wren: [14, 10], maelle: [4, 5], basile: [9, 11], cerf1: [8, 4], cerf2: [16, 13],
    },
    notes: { scene1: [12, 6] },
    lights: [[12, 9, 6, 3, "#ff9a3c"], [4, 3, 4, 2, "#7fb2ff"], [19, 3, 4, 2, "#ffb347"], [20, 13, 4, 2, "#ffb347"], [4, 14, 3, 1, "#d6f17a"]],
  },
  S02: {
    name: "S02 — Atelier des lanternes", file: "s02-atelier", states: ["base"], w: 18, h: 14,
    bench: [6, 6, 5, 2], rack: [5, 1, 6, 1], panel: [1, 4, 1, 4], exitSouth: [8, 13, 2, 1], doorEast: [17, 6, 1, 2],
    platform: [12, 2, 4, 3], hazards: [[16, 3], [14, 9], [11, 11]],
    notes: { carnet: [8, 6], panneau: [1, 6], raccord: [14, 3], ratelier: [8, 1] },
    lights: [[8, 7, 6, 3, "#ffcf8a"], [14, 3, 3, 1, "#ff7a3c"]],
  },
  S03: {
    name: "S03 — Serre basse", file: "s03-serre", states: ["base"], w: 20, h: 12,
    beds: [[1, 1, 7, 3], [11, 1, 4, 3], [1, 7, 7, 3], [11, 7, 6, 3]], bench: [16, 1, 3, 2], cooler: [18, 2],
    pots: [[18, 5], [18, 6], [18, 7]], door: [1, 11, 2, 1], ribbons: [[9, 7, 2, 2], [8, 4, 3, 2]],
    tokens: { maelle: [17, 2] },
    notes: { refroidisseur: [18, 3], pots: [19, 6] },
    lights: [[17, 2, 4, 2, "#a8e6ff"], [10, 6, 8, 4, "#cfe8b0"]],
  },
  S04: {
    name: "S04 — Coursive de service", file: "s04-coursive", states: ["base"], w: 22, h: 8,
    walkway: [0, 3, 18, 2], niche: [18, 1, 4, 6], cupboard: [5, 0, 2, 1], crate: [10, 6, 2, 1], brokenRail: [12, 5, 2],
    tokens: { basile: [20, 3], cerf: [17, 3] },
    notes: { basile: [20, 4], cerf: [16, 3] },
    lights: [[20, 3, 4, 2, "#ffcf8a"], [8, 3, 6, 3, "#b8d4ff"]],
  },
  S05: {
    name: "S05 — Chambre du phénix", file: "s05-chambre", states: ["allumee", "eteinte"], w: 18, h: 18,
    phoenix: [7, 7, 4, 4], tank: [1, 7, 3, 4], flange: [7, 1, 4, 2], selector: [14, 7, 3, 4], valve: [11, 15], exit: [8, 17, 2, 1],
    hoist: [13, 2], counterweight: [14, 4],
    tokens: { wren: [11, 15] },
    notes: { refroidir: [2, 6], isoler: [9, 3], desenchanter: [15, 6], vanne: [12, 15] },
    lights: [[9, 9, 7, 4, "#ff8a2a"], [2, 9, 3, 1, "#8fd3ff"], [15, 9, 3, 1, "#ffd27a"]],
  },
};
