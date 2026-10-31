// La Nuit des lanternes indociles — exécution pour Foundry v14 et hogwarts-system 1.2.
// Import de l'aventure (réutiliser ou nouvelle copie), copie des sorts depuis les
// compendiums du système, panneau MJ de surchauffe et de défi, vue joueurs sans secrets.
const MID = "la-nuit-des-lanternes-indociles";
const TITLE = "La Nuit des lanternes indociles";
const PACK = `${MID}.aventure`;
const SOCKET = `module.${MID}`;
const { ApplicationV2, DialogV2 } = foundry.applications.api;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

const GAUGE_MAX = 8;
const GAUGE_TEXT = [
  [0, 2, "Les lanternes clignotent ; les outils vibrent ; les conduites sifflent."],
  [3, 4, "Le phénix bat des ailes par à-coups ; les rubans se dressent comme des serpents."],
  [5, 6, "Des gouttes bouillantes tombent sous le raccord central ; Wren impose de dégager le public."],
  [7, 7, "Une fissure apparaît dans l’enveloppe du cœur. Il reste un cycle."],
  [8, 8, "Le fusible principal détruit le cœur et ouvre les soupapes. L’arrêt de sécurité termine l’incident."],
];
const MILESTONES = {
  incident: ["Incident de la scène 1", "Le phénix projette ses étincelles ; Wren court à la vanne."],
  atelier: ["Sortie de l’atelier", "Fin de l’examen de l’atelier (scène 2)."],
  serre: ["Piste de la serre basse jouée", "Le refroidisseur est récupéré ou la piste abandonnée (scène 3A)."],
  coursive: ["Piste de la coursive jouée", "La bride est récupérée ou la piste abandonnée (scène 3B)."],
};
const OPS = {
  cool: { label: "Refroidir", symbol: "Flocon", icon: "fa-snowflake", needs: null },
  isolate: { label: "Isoler", symbol: "Mâchoire", icon: "fa-grip-lines-vertical", needs: "cool" },
  disenchant: { label: "Désenchanter", symbol: "Cercle ouvert", icon: "fa-circle-notch", needs: "isolate" },
};
const GEAR = {
  cooler: { label: "Refroidisseur portatif", op: "cool", hint: "Brancher le refroidisseur : 1 progression de Refroidir, et +10 au jet restant de cette opération." },
  flange: { label: "Bride de sécurité", op: "isolate", hint: "Poser la bride : 1 progression d’Isoler ; la personne qui la pose peut expliquer la manœuvre sans jet." },
};
const CLUES = {
  loop: "Le circuit renvoie l’énergie vers le cœur.",
  cool: "Il faut refroidir avant d’ouvrir.",
  flange: "La bride permet l’isolation.",
  maelle: "Maëlle a signalé une fuite.",
  basile: "Basile a fait une modification volontaire.",
};
const OUTCOMES = {
  sauvee: ["La fête sauvée", "Le phénix baisse la tête. Une à une, les lanternes retrouvent leur hauteur normale. La constellation du groupe dessine au-dessus de la cour les cinq signes choisis au début de la séance."],
  degats: ["Une belle soirée malgré les dégâts", "Le cœur est arrêté mais abîmé. Le concours officiel est annulé ; les élèves organisent une exposition à la bougie avec les créations encore sûres."],
  evacuee: ["La serre évacuée", "Le fusible a détruit le mécanisme. Les adultes félicitent les élèves pour les personnes et les objets qu’ils ont mis à l’abri. La partie peut se terminer sur la promesse d’un nouvel essai au printemps."],
};
const HOUSES = { gryffindor: "Gryffondor", slytherin: "Serpentard", ravenclaw: "Serdaigle", hufflepuff: "Poufsouffle" };
const HANDOUTS = ["A01", "A02", "A03", "A04", "A05", "A06"];

const defaultState = () => ({
  gauge: 0,
  milestones: Object.fromEntries(Object.keys(MILESTONES).map(k => [k, false])),
  ops: { cool: 0, isolate: 0, disenchant: 0 },
  gear: { cooler: false, flange: false },
  used: { cooler: false, flange: false },
  clues: Object.fromEntries(Object.keys(CLUES).map(k => [k, false])),
  finale: false, cycle: 1, stopped: false, outcome: "", announced: false, alert7: false, alert8: false,
});

/* -------------------------------------------- */
/*  État                                        */
/* -------------------------------------------- */

export function getState() {
  return foundry.utils.mergeObject(defaultState(), game.settings.get(MID, "state") ?? {}, { inplace: false });
}

// Chaque mutation part du client qui a cliqué ; elles sont mises en file pour
// que deux clics rapprochés ne repartent pas d'une copie périmée.
let writes = Promise.resolve();
function setState(patch) {
  if (!game.user.isGM) {
    ui.notifications.warn("Seul le MJ peut modifier le défi.");
    return Promise.resolve(getState());
  }
  const run = writes.then(async () => {
    const next = foundry.utils.mergeObject(getState(), patch, { inplace: false });
    await game.settings.set(MID, "state", next);
    return next;
  });
  writes = run.catch(err => console.error(MID, err));
  return run;
}

const isActiveGM = () => game.users.activeGM?.isSelf;
const byKey = (collection, key) => collection.filter(d => d.getFlag(MID, "key") === key).at(-1);
const gaugeText = g => GAUGE_TEXT.find(([a, b]) => g >= a && g <= b)?.[2] ?? "";
const opsDone = s => Object.keys(OPS).every(k => s.ops[k] >= 2);
const opOpen = (s, key) => !OPS[key].needs || s.ops[OPS[key].needs] >= 2;

async function post(content, { gmOnly = false } = {}) {
  return ChatMessage.create({
    content: `<div class="lanternes-chat">${content}</div>`,
    speaker: { alias: TITLE },
    whisper: gmOnly ? ChatMessage.getWhisperRecipients("GM") : [],
  });
}

/* -------------------------------------------- */
/*  Surchauffe                                  */
/* -------------------------------------------- */

export async function setGauge(value, { reason = "" } = {}) {
  const before = getState();
  const gauge = Math.clamp(Math.round(value), 0, GAUGE_MAX);
  if (gauge === before.gauge) return before;
  const patch = { gauge };
  if (gauge < 7) patch.alert7 = false;
  if (gauge < 8) patch.alert8 = false;
  const state = await setState(patch);
  if (gauge > before.gauge) {
    await post(`<p><strong>Surchauffe ${gauge}/${GAUGE_MAX}</strong>${reason ? ` — ${esc(reason)}` : ""}</p><p>${gaugeText(gauge)}</p>`);
  }
  if (gauge >= 7 && !state.alert7) {
    await setState({ alert7: true });
    await post(`<p><strong>Une fissure apparaît dans l’enveloppe du cœur.</strong> Wren : « Il reste un cycle. On tente le dernier ou on se replie ? »</p>`);
  }
  if (gauge >= GAUGE_MAX && !getState().alert8) {
    await setState({ alert8: true });
    await proposeShutdown();
  }
  return getState();
}

export async function toggleMilestone(key) {
  const s = getState();
  if (!(key in MILESTONES)) return;
  const on = !s.milestones[key];
  await setState({ milestones: { [key]: on } });
  return setGauge(s.gauge + (on ? 1 : -1), { reason: on ? MILESTONES[key][0] : "" });
}

/** À 8 : proposition d'arrêt de sécurité, que le MJ décrit et confirme. */
async function proposeShutdown() {
  if (!game.user.isGM) return;
  const text = OUTCOMES.evacuee[1];
  const result = await DialogV2.wait({
    window: { title: "Surchauffe 8 — arrêt de sécurité" },
    position: { width: 520 },
    content: `<p>La jauge atteint 8. Wren tire la commande de fusible ; les secours ouvrent les issues et le cœur se consume dans sa cage. Les personnages en zone dangereuse rejoignent la rambarde sans jet de survie. Les sauvetages déjà réussis restent des réussites.</p>
      <label class="lanternes-field">Description annoncée à la table<textarea name="text" rows="5">${esc(text)}</textarea></label>`,
    buttons: [
      { action: "confirm", label: "Confirmer l’arrêt de sécurité", icon: "fas fa-power-off", default: true, callback: (e, b) => b.form.elements.text.value },
      { action: "later", label: "Plus tard (corriger la jauge)", icon: "fas fa-hand" },
    ],
    rejectClose: false,
  });
  if (typeof result !== "string") return;
  await setState({ stopped: true, outcome: "evacuee", announced: true });
  await post(`<h3>Arrêt de sécurité</h3><p>${esc(result)}</p>`);
}

/* -------------------------------------------- */
/*  Défi final                                  */
/* -------------------------------------------- */

export async function startFinale() {
  const s = getState();
  if (s.finale && !(await DialogV2.confirm({ window: { title: "Finale" }, content: "<p>Le finale est déjà commencé. Le relancer au cycle 1 sans toucher aux compteurs ?</p>", rejectClose: false }))) return;
  await setState({ finale: true, cycle: 1, stopped: false });
  await post(`<h3>Le phénix de cuivre</h3><p>Trois pistes de deux cases : <strong>Refroidir</strong> (flocon), puis <strong>Isoler</strong> (mâchoire), puis <strong>Désenchanter</strong> (cercle ouvert). Chaque joueur agit une fois par cycle ; une réussite donne une progression, un critique deux. À la fin de chaque cycle complet, la surchauffe augmente de 1.</p><p>Wren : « Vous choisissez votre place. Vous annoncez avant de toucher. Et si je dis qu’on sort, on sort. »</p>`);
  broadcastTracker();
}

export async function changeOp(key, delta, { force = false } = {}) {
  const s = getState();
  if (!(key in OPS)) return;
  if (delta > 0 && !force && !opOpen(s, key)) {
    return ui.notifications.warn(`${OPS[key].label} attend que ${OPS[OPS[key].needs].label} soit terminé (Maj+clic pour forcer).`);
  }
  const value = Math.clamp(s.ops[key] + delta, 0, 2);
  if (value === s.ops[key]) return;
  const next = await setState({ ops: { [key]: value } });
  if (delta > 0) {
    const lines = [`<p><strong>${OPS[key].label}</strong> : ${value}/2.</p>`];
    if (value === 2 && key === "cool") lines.push("<p>La zone du raccord devient manipulable avec les gants. Le reste du phénix reste dangereux.</p>");
    if (value === 2 && key === "isolate") lines.push("<p>Wren peut lâcher sa vanne et rejoindre le seuil : elle dirige l’évacuation et peut relever un élève blessé.</p>");
    await post(lines.join(""));
  }
  if (opsDone(next) && !next.stopped) await proposeVictory();
}

/** Toutes les pistes complètes : l'arrêt est réussi immédiatement, sans segment de jauge supplémentaire. */
async function proposeVictory() {
  const result = await DialogV2.wait({
    window: { title: "Arrêt réussi" },
    position: { width: 520 },
    content: `<p>Les trois opérations sont complètes : l’arrêt est réussi immédiatement, sans hausse de fin de cycle.</p>
      <label class="lanternes-field">Issue<select name="outcome">
        <option value="sauvee">Cœur intact — ${OUTCOMES.sauvee[0]}</option>
        <option value="degats">Cœur abîmé (levier d’arrêt, arrachage…) — ${OUTCOMES.degats[0]}</option>
      </select></label>`,
    buttons: [
      { action: "ok", label: "Arrêter le défi", icon: "fas fa-check", default: true, callback: (e, b) => b.form.elements.outcome.value },
      { action: "later", label: "Plus tard", icon: "fas fa-hand" },
    ],
    rejectClose: false,
  });
  if (!(result in OUTCOMES)) return;
  await setState({ stopped: true, outcome: result });
  await post(`<p><strong>L’installation s’arrête.</strong> Le phénix baisse la tête.</p>`);
  if (result === "sauvee") await setMapState("S05", "eteinte", { silent: true });
}

export async function endCycle() {
  const s = getState();
  if (!s.finale) return ui.notifications.warn("Commencez d’abord le finale.");
  if (s.stopped) return ui.notifications.info("Le défi est déjà arrêté.");
  // Les réussites du cycle sont déjà comptées : si tout est terminé, pas de hausse.
  if (opsDone(s)) return proposeVictory();
  await setState({ cycle: s.cycle + 1 });
  await setGauge(s.gauge + 1, { reason: `fin du cycle ${s.cycle}` });
}

export async function toggleGear(key) {
  if (!(key in GEAR)) return;
  const s = getState();
  const on = !s.gear[key];
  await setState({ gear: { [key]: on } });
  if (on) await post(`<p><strong>${GEAR[key].label}</strong> récupéré.</p>`);
}

export async function applyGear(key) {
  const s = getState();
  const gear = GEAR[key];
  if (!gear) return;
  if (s.used[key]) return ui.notifications.warn("Ce bénéfice a déjà été donné.");
  if (!s.gear[key]) return ui.notifications.warn(`${gear.label} n’a pas été récupéré.`);
  if (!opOpen(s, gear.op)) return ui.notifications.warn(`${OPS[gear.op].label} n’est pas encore ouverte.`);
  if (s.ops[gear.op] >= 2) return ui.notifications.warn(`${OPS[gear.op].label} est déjà terminée.`);
  await setState({ used: { [key]: true } });
  await post(`<p>${esc(gear.hint)}</p>`);
  await changeOp(gear.op, 1);
}

export async function toggleClue(key) {
  if (!(key in CLUES)) return;
  const on = !getState().clues[key];
  await setState({ clues: { [key]: on } });
  if (on) await post(`<p><strong>Conclusion partagée :</strong> ${CLUES[key]}</p>`);
}

export async function announceOutcome() {
  const s = getState();
  const key = s.outcome;
  if (!(key in OUTCOMES)) return ui.notifications.warn("Choisissez d’abord une issue.");
  const result = await DialogV2.wait({
    window: { title: `Issue — ${OUTCOMES[key][0]}` },
    position: { width: 520 },
    content: `<label class="lanternes-field">Texte annoncé<textarea name="text" rows="5">${esc(OUTCOMES[key][1])}</textarea></label>`,
    buttons: [
      { action: "ok", label: "Annoncer", icon: "fas fa-bullhorn", default: true, callback: (e, b) => b.form.elements.text.value },
      { action: "cancel", label: "Annuler" },
    ],
    rejectClose: false,
  });
  if (typeof result !== "string") return;
  await setState({ announced: true, stopped: true });
  await post(`<h3>${OUTCOMES[key][0]}</h3><p>${esc(result)}</p>`);
}

export async function resetChallenge() {
  const ok = await DialogV2.confirm({
    window: { title: "Réinitialiser la scène" },
    content: "<p>Remettre la jauge, les étapes, les accessoires, les conclusions partagées et le finale à zéro ? Les documents du monde ne sont pas modifiés.</p>",
    rejectClose: false,
  });
  if (!ok) return;
  await setState(defaultState());
  ui.notifications.info("Défi réinitialisé.");
}

/* -------------------------------------------- */
/*  Cartes, aides, points de maison             */
/* -------------------------------------------- */

const sceneByCode = code => byKey(game.scenes, code);

export async function setMapState(code, state, { silent = false } = {}) {
  const scene = sceneByCode(code);
  if (!scene) return ui.notifications.warn("Scène introuvable : importez l’aventure.");
  const src = scene.getFlag(MID, "states")?.[state];
  const level = scene.initialLevel ?? scene.levels.contents[0];
  if (!src || !level) return;
  await scene.updateEmbeddedDocuments("Level", [{ _id: level.id, "background.src": src }]);
  await scene.setFlag(MID, "state", state);
  if (!silent) ui.notifications.info(`${scene.name} : état « ${state} ».`);
}

export async function showHandout(code) {
  const entry = byKey(game.journal, `handout:${code}`);
  if (!entry) return ui.notifications.warn(`Aide ${code} introuvable : importez l’aventure.`);
  if (["A03", "A04", "A05"].includes(code)) {
    const ok = await DialogV2.confirm({ window: { title: `Montrer ${code}` }, content: `<p>${esc(entry.name)} contient une information réservée jusqu’ici. La montrer à tous les joueurs ?</p>`, rejectClose: false });
    if (!ok) return;
  }
  const level = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
  if ((entry.ownership.default ?? 0) < level) await entry.update({ "ownership.default": level });
  return foundry.documents.collections.Journal.show(entry, { force: true });
}

export async function awardHousePoints() {
  const pcs = game.actors.filter(a => a.type === "character" && a.getFlag(MID, "key"));
  const counts = {};
  for (const a of pcs) counts[a.system.profile?.house] = (counts[a.system.profile?.house] ?? 0) + 1;
  const rows = Object.entries(HOUSES).map(([k, label]) => `<label class="lanternes-field inline">${label}<input type="number" name="${k}" value="${(counts[k] ?? 0) * 5}" step="1"></label>`).join("");
  const result = await DialogV2.wait({
    window: { title: "Points de maison" },
    position: { width: 420 },
    content: `<p>Attribution proposée par l’aventure : 5 points par élève participant, soumise au MJ. Ajustez puis confirmez ; rien n’est modifié sans confirmation.</p>${rows}`,
    buttons: [
      { action: "ok", label: "Ajouter aux scores", icon: "fas fa-hourglass-half", default: true, callback: (e, b) => Object.fromEntries(Object.keys(HOUSES).map(k => [k, Number(b.form.elements[k].value) || 0])) },
      { action: "cancel", label: "Annuler" },
    ],
    rejectClose: false,
  });
  if (!result || typeof result !== "object") return;
  const stored = game.settings.get("hogwarts-system", "housePoints");
  const points = foundry.utils.deepClone(stored?.toObject?.() ?? stored ?? {});
  for (const [k, v] of Object.entries(result)) points[k] = (Number(points[k]) || 0) + v;
  await game.settings.set("hogwarts-system", "housePoints", points);
  await post(`<p><strong>Points de maison :</strong> ${Object.entries(result).filter(([, v]) => v).map(([k, v]) => `${HOUSES[k]} ${v > 0 ? "+" : ""}${v}`).join(" · ") || "aucun changement"}.</p>`);
}

export function openGuide() {
  const entry = byKey(game.journal, "guide");
  if (!entry) return ui.notifications.warn("Guide introuvable : importez l’aventure.");
  return entry.sheet.render({ force: true });
}

/* -------------------------------------------- */
/*  Panneau MJ et vue joueurs                   */
/* -------------------------------------------- */

function pips(value, max, cls = "") {
  return Array.from({ length: max }, (_, i) => `<span class="pip ${cls} ${i < value ? "on" : ""}"></span>`).join("");
}

function gaugeHTML(s) {
  const cells = Array.from({ length: GAUGE_MAX + 1 }, (_, i) => `<span class="cell g${i} ${i <= s.gauge ? "on" : ""} ${i === s.gauge ? "now" : ""}">${i}</span>`).join("");
  return `<div class="lanternes-gauge">${cells}</div><p class="lanternes-manif"><strong>${s.gauge}/${GAUGE_MAX}</strong> — ${gaugeText(s.gauge)}</p>`;
}

function opsHTML(s, gm) {
  return Object.entries(OPS).map(([k, op]) => {
    const open = opOpen(s, k);
    return `<div class="lanternes-op ${open ? "" : "locked"} ${s.ops[k] >= 2 ? "done" : ""}">
      <span class="name"><i class="fas ${op.icon}"></i> ${op.label} <small>${op.symbol}</small></span>
      <span class="pips">${pips(s.ops[k], 2)}</span>
      ${gm ? `<span class="btns"><button type="button" data-action="op" data-key="${k}" data-delta="-1" title="Retirer une progression"><i class="fas fa-minus"></i></button><button type="button" data-action="op" data-key="${k}" data-delta="1" title="Ajouter une progression (Maj+clic : ignorer l’ordre)"><i class="fas fa-plus"></i></button></span>` : ""}
    </div>`;
  }).join("");
}

class LanternesPanel extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "lanternes-panel",
    classes: ["lanternes-app"],
    window: { title: "Lanternes — panneau du défi", icon: "fas fa-fire", resizable: true },
    position: { width: 560, height: "auto" },
    actions: {
      gauge: (e, t) => setGauge(getState().gauge + Number(t.dataset.delta)),
      milestone: (e, t) => toggleMilestone(t.dataset.key),
      op: (e, t) => changeOp(t.dataset.key, Number(t.dataset.delta), { force: e.shiftKey }),
      cycle: () => endCycle(),
      finale: () => startFinale(),
      gear: (e, t) => toggleGear(t.dataset.key),
      applyGear: (e, t) => applyGear(t.dataset.key),
      clue: (e, t) => toggleClue(t.dataset.key),
      announce: () => announceOutcome(),
      reset: () => resetChallenge(),
      handout: (e, t) => showHandout(t.dataset.key),
      map: (e, t) => setMapState(t.dataset.code, t.dataset.state),
      house: () => awardHousePoints(),
      broadcast: () => broadcastTracker(),
      guide: () => openGuide(),
    },
  };

  async _renderHTML() {
    const s = getState();
    const el = document.createElement("div");
    el.className = "lanternes-panel";
    const milestones = Object.entries(MILESTONES).map(([k, [label, hint]]) =>
      `<label title="${esc(hint)}"><input type="checkbox" data-action="milestone" data-key="${k}" ${s.milestones[k] ? "checked" : ""}> ${label} <small>(+1)</small></label>`).join("");
    const gear = Object.entries(GEAR).map(([k, g]) => `<div class="lanternes-gear">
      <label><input type="checkbox" data-action="gear" data-key="${k}" ${s.gear[k] ? "checked" : ""}> ${g.label}</label>
      <button type="button" data-action="applyGear" data-key="${k}" ${s.used[k] || !s.gear[k] ? "disabled" : ""} title="${esc(g.hint)}">${s.used[k] ? "Bénéfice donné" : "Donner le bénéfice"}</button>
    </div>`).join("");
    const clues = Object.entries(CLUES).map(([k, text]) =>
      `<label><input type="checkbox" data-action="clue" data-key="${k}" ${s.clues[k] ? "checked" : ""}> ${text}</label>`).join("");
    const outcomes = `<select name="outcome"><option value="">— en cours —</option>${Object.entries(OUTCOMES).map(([k, [label]]) => `<option value="${k}" ${s.outcome === k ? "selected" : ""}>${label}</option>`).join("")}</select>`;
    const handouts = HANDOUTS.map(c => `<button type="button" data-action="handout" data-key="${c}" class="${["A03", "A04", "A05"].includes(c) ? "secret" : ""}">${c}</button>`).join("");
    const maps = `<button type="button" data-action="map" data-code="S01" data-state="fete">Cour : fête</button><button type="button" data-action="map" data-code="S01" data-state="incident">Cour : incident</button><button type="button" data-action="map" data-code="S05" data-state="allumee">Chambre : allumée</button><button type="button" data-action="map" data-code="S05" data-state="eteinte">Chambre : éteinte</button>`;
    el.innerHTML = `
      <section><h3>Surchauffe</h3>${gaugeHTML(s)}
        <div class="row"><button type="button" data-action="gauge" data-delta="-1"><i class="fas fa-minus"></i> Réduire</button><button type="button" data-action="gauge" data-delta="1"><i class="fas fa-plus"></i> Augmenter</button></div>
        <div class="checks">${milestones}</div>
        <p class="hint">Attendre indéfiniment, quitter longtemps le site ou provoquer un incident majeur ajoute aussi 1, après avoir prévenu les joueurs. Un jet raté n’augmente pas la jauge.</p>
      </section>
      <section><h3>Accessoires</h3>${gear}</section>
      <section><h3>Finale ${s.finale ? `— cycle ${s.cycle}` : ""}${s.stopped ? " — arrêté" : ""}</h3>
        ${opsHTML(s, true)}
        <div class="row"><button type="button" data-action="finale"><i class="fas fa-play"></i> Commencer le finale</button><button type="button" data-action="cycle" ${s.finale && !s.stopped ? "" : "disabled"}><i class="fas fa-rotate"></i> Terminer le cycle</button></div>
        <p class="hint">Comptez les réussites du cycle avant de le terminer : si les trois pistes sont complètes, l’arrêt est réussi sans hausse.</p>
      </section>
      <section><h3>Conclusions partagées avec les joueurs</h3><div class="checks">${clues}</div></section>
      <section><h3>Issue</h3><div class="row">${outcomes}<button type="button" data-action="announce"><i class="fas fa-bullhorn"></i> Annoncer</button></div></section>
      <section><h3>Aides</h3><div class="row wrap">${handouts}</div><p class="hint">A03, A04 et A05 demandent une confirmation.</p></section>
      <section><h3>Cartes</h3><div class="row wrap">${maps}</div></section>
      <section class="row wrap">
        <button type="button" data-action="broadcast"><i class="fas fa-eye"></i> Suivi aux joueurs</button>
        <button type="button" data-action="guide"><i class="fas fa-book"></i> Guide</button>
        <button type="button" data-action="house"><i class="fas fa-hourglass-half"></i> Points de maison</button>
        <button type="button" data-action="reset" class="danger"><i class="fas fa-eraser"></i> Réinitialiser</button>
      </section>`;
    return el;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
    content.querySelector("select[name=outcome]")?.addEventListener("change", ev => setState({ outcome: ev.target.value }));
  }
}

class LanternesTracker extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "lanternes-tracker",
    classes: ["lanternes-app"],
    window: { title: "Lanternes — suivi", icon: "fas fa-fire" },
    position: { width: 380, height: "auto" },
  };

  async _renderHTML() {
    const s = getState();
    const el = document.createElement("div");
    el.className = "lanternes-panel tracker";
    const gear = Object.entries(GEAR).filter(([k]) => s.gear[k]).map(([, g]) => `<li>${g.label}</li>`).join("");
    const clues = Object.entries(CLUES).filter(([k]) => s.clues[k]).map(([, t]) => `<li>${t}</li>`).join("");
    el.innerHTML = `
      <section><h3>Surchauffe</h3>${gaugeHTML(s)}</section>
      ${s.finale ? `<section><h3>Arrêt du phénix${s.stopped ? "" : ` — cycle ${s.cycle}`}</h3>${opsHTML(s, false)}</section>` : ""}
      ${gear ? `<section><h3>Accessoires récupérés</h3><ul>${gear}</ul></section>` : ""}
      ${clues ? `<section><h3>Ce que vous avez compris</h3><ul>${clues}</ul></section>` : ""}
      ${s.announced && OUTCOMES[s.outcome] ? `<section><h3>${OUTCOMES[s.outcome][0]}</h3></section>` : ""}`;
    return el;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }
}

let panelApp;
let trackerApp;
export function panel() {
  if (!game.user.isGM) return tracker();
  panelApp ??= new LanternesPanel();
  return panelApp.render({ force: true });
}
export function tracker({ broadcast = false } = {}) {
  if (broadcast && game.user.isGM) broadcastTracker();
  trackerApp ??= new LanternesTracker();
  return trackerApp.render({ force: true });
}
function broadcastTracker() {
  if (!game.user.isGM) return;
  game.socket.emit(SOCKET, { type: "tracker" });
  ui.notifications.info("Suivi affiché chez les joueurs connectés.");
}
const refresh = foundry.utils.debounce(() => {
  if (panelApp?.rendered) panelApp.render();
  if (trackerApp?.rendered) trackerApp.render();
}, 50);

class PanelMenu extends ApplicationV2 {
  async render() { panel(); return this; }
}
class ImportMenu extends ApplicationV2 {
  async render() { openImporter(); return this; }
}

/* -------------------------------------------- */
/*  Import                                      */
/* -------------------------------------------- */

async function getAdventure() {
  const pack = game.packs.get(PACK);
  if (!pack) throw new Error("Compendium de l’aventure introuvable.");
  const [index] = pack.index.contents;
  return pack.getDocument(index._id);
}

const CONTENT = { actors: "Actor", items: "Item", journal: "JournalEntry", scenes: "Scene", macros: "Macro", playlists: "Playlist", folders: "Folder" };

export async function openImporter() {
  if (!game.user.isGM) return ui.notifications.warn("Import réservé au MJ.");
  const adventure = await getAdventure();
  const data = adventure.toObject();
  const present = Object.entries(CONTENT).reduce((n, [field, name]) =>
    n + data[field].filter(d => game.collections.get(name).has(d._id)).length, 0);

  if (!present) {
    const ok = await DialogV2.confirm({
      window: { title: TITLE },
      content: `<p>Importer l’aventure dans ce monde ? Tout sera rangé dans des dossiers « ${TITLE} ». Les scènes resteront inactives, les prétirés sans propriétaire et les secrets non partagés.</p>`,
      yes: { label: "Importer", icon: "fas fa-download" }, no: { label: "Plus tard" }, rejectClose: false,
    });
    if (ok) await adventure.import({ dialog: false });
    return;
  }

  const choice = await DialogV2.wait({
    window: { title: `${TITLE} — réimport` },
    position: { width: 520 },
    content: `<p>${present} document(s) de l’aventure existent déjà dans ce monde. Que voulez-vous faire ? Aucune option ne supprime quoi que ce soit.</p>
      <ul><li><strong>Réutiliser</strong> : les documents présents sont gardés tels quels (vos modifications sont conservées) ; seuls les documents manquants sont recréés.</li>
      <li><strong>Nouvelle copie</strong> : un second exemplaire complet, avec de nouveaux identifiants, dans des dossiers suffixés. Les liens des journaux pointent vers la copie.</li></ul>`,
    buttons: [
      { action: "reuse", label: "Réutiliser", icon: "fas fa-recycle", default: true },
      { action: "copy", label: "Nouvelle copie", icon: "fas fa-copy" },
      { action: "cancel", label: "Annuler", icon: "fas fa-xmark" },
    ],
    rejectClose: false,
  });
  if (choice === "reuse") {
    await adventure.import({
      dialog: false,
      preImport: [importData => {
        importData.toUpdate = {};
        importData.documentCount = Object.values(importData.toCreate).reduce((n, docs) => n + docs.length, 0);
      }],
    });
    ui.notifications.info("Réimport terminé : documents existants conservés, documents manquants recréés.");
  } else if (choice === "copy") {
    await importCopy(adventure);
  }
}

/** Seconde copie : nouveaux identifiants partout, liens internes réécrits. */
async function importCopy(adventure) {
  const data = adventure.toObject();
  const map = new Map();
  for (const field of Object.keys(CONTENT)) for (const d of data[field]) map.set(d._id, foundry.utils.randomID());
  let json = JSON.stringify(data);
  for (const [from, to] of map) json = json.replaceAll(from, to);
  const copy = JSON.parse(json);
  const stamp = new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  for (const f of copy.folders) if (!f.folder) f.name = `${f.name} (copie du ${stamp})`;

  const bar = ui.notifications.info("Création de la copie…", { progress: true });
  // Dossiers parents d'abord, pour que chaque sous-dossier trouve son parent.
  const created = {};
  let remaining = [...copy.folders];
  const done = new Set();
  while (remaining.length) {
    const ready = remaining.filter(f => !f.folder || done.has(f.folder));
    if (!ready.length) throw new Error("Hiérarchie de dossiers invalide.");
    await Folder.createDocuments(ready, { keepId: true, render: false });
    ready.forEach(f => done.add(f._id));
    remaining = remaining.filter(f => !done.has(f._id));
  }
  const steps = Object.entries(CONTENT).filter(([field]) => field !== "folders");
  for (const [i, [field, name]] of steps.entries()) {
    if (!copy[field].length) continue;
    const cls = getDocumentClass(name);
    created[name] = await cls.createDocuments(copy[field], { keepId: true, render: false, renderSheet: false });
    bar.update({ pct: (i + 1) / steps.length });
  }
  bar.update({ pct: 1 });
  await afterImport(created.Actor ?? []);
  await ui.sidebar.render();
  ui.notifications.info("Nouvelle copie de l’aventure créée.");
}

/** Copie les sorts et la potion depuis les compendiums installés du système et écrit le rapport. */
async function afterImport(actors) {
  const lines = [];
  const missing = new Set();
  for (const actor of actors) {
    const wanted = [
      ...(actor.getFlag(MID, "spells") ?? []).map(id => ["hogwarts-spells", id, 1]),
      ...(actor.getFlag(MID, "potions") ?? []).map(([id, qty]) => ["hogwarts-potions", id, qty]),
    ];
    if (!wanted.length) continue;
    const owned = new Set(actor.items.map(i => i._stats?.compendiumSource).filter(Boolean));
    const toCreate = [];
    for (const [packName, id, qty] of wanted) {
      const uuid = `Compendium.hogwarts-system.${packName}.Item.${id}`;
      if (owned.has(uuid)) continue;
      const doc = await fromUuid(uuid);
      if (!doc) {
        missing.add(uuid);
        continue;
      }
      const item = game.items.fromCompendium(doc);
      if (packName === "hogwarts-potions") item.system.quantity = qty;
      foundry.utils.setProperty(item, `flags.${MID}.source`, uuid);
      toCreate.push(item);
    }
    if (toCreate.length) await actor.createEmbeddedDocuments("Item", toCreate, { render: false });
    lines.push(`<li>@UUID[${actor.uuid}]{${esc(actor.name)}} : ${toCreate.length} objet(s) copiés depuis le système.</li>`);
  }
  const tech = byKey(game.journal, "tech");
  const page = tech?.pages.find(p => p.getFlag(MID, "key") === "tech:report");
  const report = `<p>Dernier import : ${new Date().toLocaleString("fr-FR")} — Foundry ${game.release.version}, ${game.system.id} ${game.system.version}, module ${game.modules.get(MID).version}.</p>
    <ul>${lines.join("") || "<li>Aucun acteur à compléter.</li>"}</ul>
    ${missing.size ? `<p><strong>Documents introuvables dans les compendiums du système (aucun remplacement créé) :</strong></p><ul>${[...missing].map(u => `<li><code>${u}</code></li>`).join("")}</ul>` : "<p>Toutes les références des compendiums du système ont été trouvées.</p>"}`;
  if (page) await page.update({ "text.content": report });
  if (missing.size) {
    await post(`<p><strong>Import :</strong> ${missing.size} document(s) du système introuvable(s). Voir ${page ? `@UUID[${page.uuid}]{le rapport d’import}` : "le journal technique"}.</p>`, { gmOnly: true });
  }
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

const ACTIONS = {
  panel, tracker: () => tracker(), "tracker-all": () => tracker({ broadcast: true }), import: openImporter, guide: openGuide,
  finale: startFinale, cycle: endCycle, housepoints: awardHousePoints,
  cooler: () => getState().gear.cooler || toggleGear("cooler"), flange: () => getState().gear.flange || toggleGear("flange"),
  "milestone-incident": () => getState().milestones.incident || toggleMilestone("incident"),
  "milestone-atelier": () => getState().milestones.atelier || toggleMilestone("atelier"),
  "milestone-serre": () => getState().milestones.serre || toggleMilestone("serre"),
  "milestone-coursive": () => getState().milestones.coursive || toggleMilestone("coursive"),
};

Hooks.once("init", () => {
  game.settings.register(MID, "state", { scope: "world", config: false, type: Object, default: defaultState(), onChange: () => refresh() });
  game.settings.register(MID, "welcomeVersion", { scope: "world", config: false, type: String, default: "" });
  game.settings.registerMenu(MID, "panel", {
    name: "Panneau du défi", label: "Ouvrir", hint: "Surchauffe, étapes, accessoires, finale, conclusions partagées, issue, aides et cartes.",
    icon: "fas fa-fire", type: PanelMenu, restricted: true,
  });
  game.settings.registerMenu(MID, "import", {
    name: "Importer l’aventure", label: "Importer", hint: "Import initial, ou réimport (réutiliser l’existant ou créer une nouvelle copie).",
    icon: "fas fa-download", type: ImportMenu, restricted: true,
  });

  // @Lanternes[action]{libellé} dans les journaux devient un lien d'action MJ.
  CONFIG.TextEditor.enrichers.push({
    pattern: /@Lanternes\[([\w-]+)\]\{([^}]+)\}/g,
    enricher: match => {
      const link = document.createElement("a");
      link.className = "lanternes-action";
      link.dataset.lanternesAction = match[1];
      link.innerHTML = `<i class="fas fa-fire"></i> ${esc(match[2])}`;
      return link;
    },
  });
  document.addEventListener("click", event => {
    const link = event.target.closest?.("a.lanternes-action");
    if (!link) return;
    event.preventDefault();
    const name = link.dataset.lanternesAction;
    if (!game.user.isGM && name !== "tracker") return ui.notifications.warn("Action réservée au MJ.");
    ACTIONS[name]?.();
  });
});

Hooks.once("ready", async () => {
  game.modules.get(MID).api = {
    panel, tracker, getState, setGauge, toggleMilestone, startFinale, changeOp, endCycle, toggleGear, applyGear,
    toggleClue, announceOutcome, resetChallenge, setMapState, showHandout, awardHousePoints, openGuide, openImporter,
  };
  game.socket.on(SOCKET, message => {
    if (message?.type === "tracker" && !game.user.isGM) tracker();
  });
  if (!isActiveGM()) return;
  const version = game.modules.get(MID).version;
  if (game.settings.get(MID, "welcomeVersion") === version) return;
  await game.settings.set(MID, "welcomeVersion", version);
  if (byKey(game.journal, "guide")) return ui.notifications.info(`${TITLE} ${version} est prêt. Macro « Lanternes · Panneau du défi » pour suivre la soirée.`);
  openImporter();
});

// Toute importation de cette aventure, y compris depuis la fenêtre native du compendium.
Hooks.on("importAdventure", async (adventure, options, created, updated) => {
  if (adventure.pack !== PACK) return;
  await afterImport([...(created.Actor ?? []), ...(updated.Actor ?? [])]);
  const guide = byKey(game.journal, "guide");
  ui.notifications.info(`${TITLE} importée. Ouvrez le guide du MJ, page « Démarrage rapide ».`);
  guide?.sheet.render({ force: true });
});
