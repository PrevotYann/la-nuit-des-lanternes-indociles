// Assemble les illustrations définitives et les cartes à géométrie fixe en WebP.
// Les matériaux et accessoires peints sont découpés dans les formes existantes ;
// tools/layout.mjs et les documents Foundry restent la référence géométrique.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { MAPS, GRID } from "./layout.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "assets");
const ART = path.join(ROOT, "tools", "artwork");
const artwork = key => path.join(ART, `${key}.webp`);
// librsvg ne décode pas le WebP embarqué : PNG en mémoire, WebP en sortie.
const inputs = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "art-prompts.json"), "utf8")).assets;
const embedded = new Map(await Promise.all(Object.keys(inputs).map(async key => [key,
  `data:image/png;base64,${(await sharp(artwork(key)).png().toBuffer()).toString("base64")}`
])));
const imageURI = key => {
  if (!embedded.has(key)) throw new Error(`Illustration source manquante : ${key}`);
  return embedded.get(key);
};
const surface = (id, key, width, height = width) => `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${width}" height="${height}"><image href="${imageURI(key)}" width="${width}" height="${height}" preserveAspectRatio="none"/></pattern>`;
const G = GRID;
const SERIF = "'EB Garamond', 'DejaVu Serif', serif";
const SANS = "'DejaVu Sans', sans-serif";

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];
const f = n => Math.round(n * 10) / 10;

async function write(svg, file, { width, height, quality = 92 } = {}) {
  const dest = path.join(OUT, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let img = sharp(Buffer.from(svg), { density: 72 });
  if (width) img = img.resize(width, height);
  await img.webp({ quality }).toFile(dest);
  return dest;
}

/* -------------------------------------------- */
/*  Motifs de sol                               */
/* -------------------------------------------- */

function flagstones(W, H, r, base = [118, 108, 96]) {
  const out = [`<rect width="${W}" height="${H}" fill="rgb(${base.join(",")})"/>`];
  for (let y = 0; y < H; ) {
    const h = 45 + r() * 30;
    for (let x = -r() * 60; x < W; ) {
      const w = 60 + r() * 70;
      const d = (r() - 0.5) * 26;
      const c = base.map(v => Math.round(v + d + (r() - 0.5) * 8));
      out.push(`<rect x="${f(x + 2)}" y="${f(y + 2)}" width="${f(w - 4)}" height="${f(h - 4)}" rx="6" fill="rgb(${c.join(",")})"/>`);
      if (r() < 0.12) out.push(`<ellipse cx="${f(x + w * r())}" cy="${f(y + h * r())}" rx="${f(8 + r() * 14)}" ry="${f(5 + r() * 8)}" fill="#5f7a3a" opacity="0.45"/>`);
      x += w;
    }
    y += h;
  }
  // L'ancien tirage aléatoire est conservé pour ne déplacer aucun détail ultérieur.
  return `<rect width="${W}" height="${H}" fill="url(#stoneTexture)"/>`;
}

function planks(W, H, r, base = [122, 84, 52], horizontal = true) {
  const out = [`<rect width="${W}" height="${H}" fill="rgb(${base.join(",")})"/>`];
  const span = horizontal ? H : W;
  for (let a = 0; a < span; a += 25) {
    for (let b = -r() * 200; b < (horizontal ? W : H); ) {
      const len = 150 + r() * 250;
      const d = (r() - 0.5) * 30;
      const c = base.map(v => Math.round(v + d));
      out.push(horizontal
        ? `<rect x="${f(b)}" y="${a}" width="${f(len - 2)}" height="23" fill="rgb(${c.join(",")})"/><line x1="${f(b + 10)}" y1="${a + 8 + f(r() * 8)}" x2="${f(b + len - 20)}" y2="${a + 8 + f(r() * 8)}" stroke="rgba(0,0,0,0.12)" stroke-width="1.5"/>`
        : `<rect x="${a}" y="${f(b)}" width="23" height="${f(len - 2)}" fill="rgb(${c.join(",")})"/>`);
      b += len;
    }
  }
  return `<rect width="${W}" height="${H}" fill="url(#floorWood)"/>`;
}

function soil(W, H, r, base = [96, 72, 48]) {
  const out = [`<rect width="${W}" height="${H}" fill="rgb(${base.join(",")})"/>`];
  for (let i = 0; i < (W * H) / 900; i++) {
    const c = base.map(v => Math.round(v + (r() - 0.5) * 40));
    out.push(`<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(1.5 + r() * 4)}" fill="rgb(${c.join(",")})" opacity="0.7"/>`);
  }
  return `<rect width="${W}" height="${H}" fill="url(#soilTexture)"/><rect width="${W}" height="${H}" fill="#211b17" opacity="0.32"/>`;
}

function gravel(x, y, w, h, r) {
  const out = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#a39a88"/>`];
  for (let i = 0; i < (w * h) / 260; i++) {
    out.push(`<circle cx="${f(x + r() * w)}" cy="${f(y + r() * h)}" r="${f(2 + r() * 3.5)}" fill="${pick(r, ["#8e8574", "#b8af9c", "#9c927f", "#c4bba7"])}"/>`);
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#soilTexture)"/>`;
}

function plates(W, H, r) {
  const out = [`<rect width="${W}" height="${H}" fill="#4b4540"/>`];
  for (let y = 0; y < H; y += 150) for (let x = 0; x < W; x += 150) {
    const d = (r() - 0.5) * 14;
    out.push(`<rect x="${x + 3}" y="${y + 3}" width="144" height="144" fill="url(#ironTexture)" stroke="#2f2a26" stroke-width="2"/><rect x="${x + 4}" y="${y + 4}" width="142" height="142" fill="#9a805f" opacity="${0.05 + (d + 7) / 160}"/>`);
    for (const [dx, dy] of [[12, 12], [138, 12], [12, 138], [138, 138]]) out.push(`<circle cx="${x + dx}" cy="${y + dy}" r="4" fill="#9a8f80"/>`);
  }
  return out.join("");
}

/* -------------------------------------------- */
/*  Éléments communs                            */
/* -------------------------------------------- */

const DEFS = `<defs>
  ${surface("stoneTexture", "stone", 1000)}
  ${surface("floorWood", "wood", 1000)}
  ${surface("soilTexture", "gravel", 800)}
  ${surface("ironTexture", "iron", 600)}
  ${surface("plantsTexture", "botanical", 500)}
  ${surface("sacking", "paper", 160)}
  <radialGradient id="pumpkin" cx="0.35" cy="0.3"><stop stop-color="#efab44"/><stop offset="0.6" stop-color="#cc6c1b"/><stop offset="1" stop-color="#794014"/></radialGradient>
  <radialGradient id="terracotta" cx="0.3" cy="0.25"><stop stop-color="#cd8450"/><stop offset="0.7" stop-color="#a5532c"/><stop offset="1" stop-color="#71391d"/></radialGradient>
  <radialGradient id="glowO"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.95"/><stop offset="0.35" stop-color="#ff9a3c" stop-opacity="0.55"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowB"><stop offset="0" stop-color="#d8ecff" stop-opacity="0.95"/><stop offset="0.35" stop-color="#7fb2ff" stop-opacity="0.5"/><stop offset="1" stop-color="#4f7fd8" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowR"><stop offset="0" stop-color="#fff0c0"/><stop offset="0.4" stop-color="#ff7a2a" stop-opacity="0.8"/><stop offset="1" stop-color="#c4380c" stop-opacity="0"/></radialGradient>
  <radialGradient id="steam"><stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
  ${surface("copper", "copper", 160)}
  <linearGradient id="copperDark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9b6236"/><stop offset="1" stop-color="#4e2a12"/></linearGradient>
  ${surface("wood", "wood", 500)}
  <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9f1ff" stop-opacity="0.75"/><stop offset="1" stop-color="#7fb7d6" stop-opacity="0.45"/></linearGradient>
  <pattern id="hazard" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="40" height="40" fill="#f2c230" opacity="0.55"/><rect width="20" height="40" fill="#1d1d1d" opacity="0.55"/></pattern>
  <pattern id="grate" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#2a2420"/><rect x="2" y="2" width="12" height="12" fill="#5a5048"/></pattern>
  <filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="6" dy="8" stdDeviation="6" flood-color="#000" flood-opacity="0.45"/></filter>
  <filter id="unlitPhoenix"><feColorMatrix type="saturate" values="0.15"/><feComponentTransfer><feFuncR type="linear" slope="0.55"/><feFuncG type="linear" slope="0.55"/><feFuncB type="linear" slope="0.55"/></feComponentTransfer></filter>
</defs>`;

const C = (x, y, w = 1, h = 1) => ({ x: x * G, y: y * G, w: w * G, h: h * G });

function walls(W, H, gaps, color = "#3b322b", t = 30) {
  // gaps : [x, y, w, h] en cases sur le bord.
  const segs = [];
  const sides = { top: [], bottom: [], left: [], right: [] };
  for (const [x, y, w, h] of gaps) {
    if (y === 0) sides.top.push([x * G, (x + w) * G]);
    else if (y + h >= H / G) sides.bottom.push([x * G, (x + w) * G]);
    else if (x === 0) sides.left.push([y * G, (y + h) * G]);
    else sides.right.push([y * G, (y + h) * G]);
  }
  const run = (len, holes, draw) => {
    let s = 0;
    for (const [a, b] of holes.sort((p, q) => p[0] - q[0])) { if (a > s) draw(s, a); s = b; }
    if (s < len) draw(s, len);
  };
  run(W, sides.top, (a, b) => segs.push(`<rect x="${a}" y="0" width="${b - a}" height="${t}" fill="${color}"/>`));
  run(W, sides.bottom, (a, b) => segs.push(`<rect x="${a}" y="${H - t}" width="${b - a}" height="${t}" fill="${color}"/>`));
  run(H, sides.left, (a, b) => segs.push(`<rect x="0" y="${a}" width="${t}" height="${b - a}" fill="${color}"/>`));
  run(H, sides.right, (a, b) => segs.push(`<rect x="${W - t}" y="${a}" width="${t}" height="${b - a}" fill="${color}"/>`));
  return `<g filter="url(#shadow)">${segs.join("")}</g>`;
}

function lantern(x, y, color = "O", r = 70, dim = false) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#glow${color})" opacity="${dim ? 0.35 : 0.9}"/>
    <rect x="${x - 11}" y="${y - 14}" width="22" height="28" rx="6" fill="${color === "B" ? "#bcdcff" : "#ffcf7a"}" stroke="#5a3b1a" stroke-width="3"/>`;
}

function pipe(points, w = 18, { danger = false } = {}) {
  const d = points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  return `${danger ? `<path d="${d}" stroke="url(#hazard)" stroke-width="${w + 46}" fill="none" stroke-linejoin="round"/>` : ""}
    <path d="${d}" stroke="#3a1f0c" stroke-width="${w + 6}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d}" stroke="url(#copper)" stroke-width="${w}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d}" stroke="#ffd9a8" stroke-width="${w / 5}" fill="none" opacity="0.5" stroke-linejoin="round"/>`;
}

function label(x, y, text, size = 42, { color = "#fff4dc", anchor = "middle", bg = "rgba(20,14,8,0.72)" } = {}) {
  const w = text.length * size * 0.7 + 28;
  const bx = anchor === "middle" ? x - w / 2 : x - 12;
  return `<rect x="${f(bx)}" y="${f(y - size * 0.95)}" width="${f(w)}" height="${f(size * 1.35)}" rx="8" fill="${bg}"/>
    <text x="${x}" y="${y}" font-family="${SANS}" font-weight="bold" font-size="${size}" fill="${color}" text-anchor="${anchor}">${text}</text>`;
}

function hot(x, y) {
  return `<g transform="translate(${x},${y})"><path d="M0,-46 L42,30 L-42,30 Z" fill="#f2c230" stroke="#1d1d1d" stroke-width="5" stroke-linejoin="round"/>
    <text x="0" y="22" font-family="${SANS}" font-weight="bold" font-size="46" text-anchor="middle" fill="#1d1d1d">!</text></g>${label(x, y + 78, "CHAUD", 34, { color: "#ffe08a" })}`;
}

function steam(x, y, r, n = 5, seed = 1) {
  const rr = rng(seed);
  return Array.from({ length: n }, () => `<circle cx="${f(x + (rr() - 0.5) * r * 1.6)}" cy="${f(y + (rr() - 0.5) * r * 1.6)}" r="${f(r * (0.4 + rr() * 0.6))}" fill="url(#steam)"/>`).join("");
}

function phoenixTop(cx, cy, size, { lit = true } = {}) {
  // Même enveloppe et même centre que l'ancien automate ; seul le dessin change.
  const x = cx - size * 0.61, y = cy - size * 0.425;
  return `${lit ? `<circle cx="${cx}" cy="${cy}" r="${size * 0.75}" fill="url(#glowO)" opacity="0.36"/>` : ""}
    <image href="${imageURI("phoenix")}" x="${x}" y="${y}" width="${size * 1.22}" height="${size * 1.025}" preserveAspectRatio="none" ${lit ? "" : 'filter="url(#unlitPhoenix)"'}/>`;
}

function stall({ rect: [x, y, w, h] }, kind, r, tipped = false) {
  const p = C(x, y, w, h);
  const out = [`<g filter="url(#shadow)"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="url(#wood)" stroke="#3b2414" stroke-width="5" rx="6"/>`];
  const stripes = Math.floor(p.w / 40);
  for (let i = 0; i < stripes; i += 2) out.push(`<rect x="${p.x + i * 40}" y="${p.y}" width="40" height="34" fill="${kind === "courges" ? "#3e7d4a" : kind === "poissons" ? "#3d5fa8" : "#a63a2c"}" opacity="0.9"/>`);
  out.push(`<image href="${imageURI(`stall-${kind}`)}" x="${p.x + 3}" y="${p.y + 3}" width="${p.w - 6}" height="${p.h - 6}" preserveAspectRatio="none"/></g>`);
  const items = [];
  for (let i = 0; i < 7; i++) {
    const ix = p.x + 30 + r() * (p.w - 60), iy = p.y + 60 + r() * (p.h - 90);
    if (kind === "courges") {
      const rad = f(18 + r() * 8);
      items.push(`<circle cx="${f(ix)}" cy="${f(iy)}" r="${rad}" fill="url(#pumpkin)" stroke="#7a3a0a" stroke-width="3"/><ellipse cx="${f(ix)}" cy="${f(iy)}" rx="${rad * 0.47}" ry="${rad * 0.88}" fill="none" stroke="#9b571b" stroke-width="1.6"/><path d="M${f(ix)},${f(iy - 20)} q4,-10 10,-12" stroke="#4c6935" stroke-width="4" fill="none"/>`);
    }
    if (kind === "poissons") items.push(`<path transform="translate(${f(ix)},${f(iy)}) rotate(${f(r() * 360)})" d="M-22,0 Q0,-14 18,0 Q0,14 -22,0 Z M18,0 L30,-10 L30,10 Z" fill="${pick(r, ["#f4e2b8", "#bfe0ff", "#ffd0a0"])}" stroke="#5a4a3a" stroke-width="2"/>`);
    if (kind === "pommes") items.push(`<circle cx="${f(ix)}" cy="${f(iy)}" r="12" fill="#b3261e" stroke="#5a1410" stroke-width="2"/><circle cx="${f(ix - 4)}" cy="${f(iy - 4)}" r="4" fill="#f0c070" opacity="0.8"/>`);
  }
  if (tipped && kind === "courges") {
    return `<g transform="rotate(-18 ${p.x + p.w / 2} ${p.y + p.h / 2})">${out.join("")}</g>${items.map((it, i) => `<g transform="translate(${f((r() - 0.2) * 160)},${f(80 + r() * 120)})">${it}</g>`).join("")}`;
  }
  return out.join("");
}

function mapS01(state) {
  const m = MAPS.S01, W = m.w * G, H = m.h * G, r = rng(101), inc = state === "incident";
  const out = [DEFS, flagstones(W, H, r)];
  const ph = C(...m.phoenix), pcx = ph.x + ph.w / 2, pcy = ph.y + ph.h / 2;
  // Conduites protégées vers l'atelier (nord), la serre basse (est) et la coursive (ouest).
  out.push(pipe([[pcx, pcy], [pcx, 40]], 20), pipe([[pcx, pcy], [W - 40, pcy]], 16), pipe([[pcx, pcy], [40, pcy]], 16));
  for (const [x1, y1, x2, y2] of [[pcx - 30, 60, pcx + 30, ph.y], [ph.x + ph.w, pcy - 30, W - 60, pcy + 30], [60, pcy - 30, ph.x, pcy + 30]]) {
    out.push(`<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" fill="url(#grate)" opacity="0.55"/>`);
  }
  // Socle et boucle gravée.
  out.push(`<circle cx="${pcx}" cy="${pcy}" r="${ph.w / 2}" fill="url(#stoneTexture)" stroke="#4b4239" stroke-width="10" filter="url(#shadow)"/><circle cx="${pcx}" cy="${pcy}" r="${ph.w / 2 - 6}" fill="#82725e" opacity="0.25"/>`);
  out.push(`<circle cx="${pcx}" cy="${pcy}" r="${ph.w / 2 - 34}" fill="none" stroke="${inc ? "#ff8a3a" : "#c9a76a"}" stroke-width="8" stroke-dasharray="40 16"/>`);
  out.push(phoenixTop(pcx, pcy + 20, 300, { lit: true, flutter: inc ? 1 : 0 }));
  // Stands et table des lucioles.
  m.stands.forEach((st, i) => out.push(stall(st, st.id, rng(200 + i), inc && st.id === "courges")));
  const t = C(...m.table);
  out.push(`<g filter="url(#shadow)"><rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="6" fill="url(#wood)" stroke="#3b2414" stroke-width="5" transform="rotate(${inc ? 4 : 0} ${t.x} ${t.y})"/></g>`);
  out.push(`<rect x="${t.x + 120}" y="${t.y + 50}" width="140" height="90" rx="6" fill="#d9c9a3" stroke="#6b5434" stroke-width="4"/>`);
  for (let i = 0; i < 14; i++) out.push(`<circle cx="${f(t.x + 30 + r() * (t.w - 60))}" cy="${f(t.y + 25 + r() * (t.h - 50))}" r="6" fill="#e6f27a" opacity="0.95"/>`);
  // Lanternes : hautes et alignées pendant la fête, basses et dispersées pendant l'incident.
  const lr = rng(inc ? 303 : 302);
  for (let i = 0; i < 26; i++) {
    const x = 120 + lr() * (W - 240), y = 120 + lr() * (H - 240);
    if (Math.hypot(x - pcx, y - pcy) < 260) continue;
    out.push(lantern(f(x), f(y), i % 3 ? "O" : "B", inc ? 50 : 75));
  }
  if (inc) {
    out.push(steam(pcx, pcy - 120, 120, 6, 9), steam(W - 300, pcy, 90, 4, 10), steam(300, pcy, 90, 4, 11));
    for (let i = 0; i < 40; i++) out.push(`<circle cx="${f(pcx + (lr() - 0.5) * 900)}" cy="${f(pcy + (lr() - 0.5) * 700)}" r="${f(3 + lr() * 4)}" fill="#bfe6ff" opacity="0.9"/>`);
    for (let i = 0; i < 6; i++) {
      const x = 300 + lr() * (W - 600), y = 300 + lr() * (H - 600);
      out.push(`<path d="M${f(x)},${f(y)} c40,-30 80,30 120,0 s80,30 120,0" stroke="#3d6fd8" stroke-width="8" fill="none" opacity="0.85"/>`);
    }
  }
  out.push(walls(W, H, Object.values(m.exits)));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out.join("")}</svg>`;
}

function mapS02() {
  const m = MAPS.S02, W = m.w * G, H = m.h * G, r = rng(202);
  const out = [DEFS, planks(W, H, r)];
  // Conduites le long du mur est et vers la plateforme.
  out.push(pipe([[W - 70, H - 60], [W - 70, 260], [1450, 260]], 20, { danger: true }));
  out.push(pipe([[W - 70, 760], [1100, 1100], [1100, H - 40]], 14, { danger: true }));
  const pl = C(...m.platform);
  out.push(`<g filter="url(#shadow)"><rect x="${pl.x}" y="${pl.y}" width="${pl.w}" height="${pl.h}" fill="#5b4a3b" stroke="#2a2018" stroke-width="8"/></g>`);
  out.push(`<rect x="${pl.x + 60}" y="${pl.y + 40}" width="${pl.w - 120}" height="${pl.h - 80}" fill="url(#grate)" opacity="0.8"/>`);
  out.push(`<circle cx="${pl.x + pl.w / 2}" cy="${pl.y + 60}" r="34" fill="none" stroke="#e8c06a" stroke-width="12"/>`);
  out.push(`<path d="M${pl.x + pl.w / 2 - 50},${pl.y + 130} L${pl.x + pl.w / 2 + 50},${pl.y + 130} M${pl.x + pl.w / 2 - 50},${pl.y + 130} l25,-18 M${pl.x + pl.w / 2 - 50},${pl.y + 130} l25,18" stroke="#ffe08a" stroke-width="8" fill="none"/>`);
  // Établi, tasse renversée, carnet, empreintes.
  const b = C(...m.bench);
  out.push(`<g filter="url(#shadow)"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="url(#wood)" stroke="#3b2414" stroke-width="6" rx="4"/></g>`);
  out.push(`<ellipse cx="${b.x + 230}" cy="${b.y + 95}" rx="80" ry="38" fill="#7a4a1e" opacity="0.6"/>`);
  out.push(`<rect x="${b.x + 180}" y="${b.y + 55}" width="110" height="80" fill="#efe2c2" stroke="#6b5434" stroke-width="3" transform="rotate(-8 ${b.x + 235} ${b.y + 95})"/>`);
  out.push(`<circle cx="${b.x + 320}" cy="${b.y + 70}" r="18" fill="#e9e2d0" stroke="#6b5434" stroke-width="4"/>`);
  for (let i = 0; i < 4; i++) out.push(`<ellipse cx="${b.x + 380 + i * 14}" cy="${b.y + 120 - i * 4}" rx="6" ry="9" fill="#c0392b" opacity="0.85"/>`);
  for (let i = 0; i < 8; i++) out.push(`<rect x="${f(b.x + 30 + r() * 120)}" y="${f(b.y + 30 + r() * 140)}" width="${f(20 + r() * 40)}" height="8" fill="#5d5d5d" transform="rotate(${f(r() * 180)} ${b.x + 80} ${b.y + 100})"/>`);
  // Râtelier avec un emplacement vide.
  const rk = C(...m.rack);
  out.push(`<rect x="${rk.x}" y="${rk.y}" width="${rk.w}" height="${rk.h - 20}" fill="#4a3322" stroke="#24170d" stroke-width="5"/>`);
  for (let i = 0; i < 9; i++) if (i !== 6) out.push(`<rect x="${rk.x + 30 + i * 62}" y="${rk.y + 10}" width="26" height="55" rx="5" fill="${pick(r, ["#8d8d8d", "#b87333", "#6b6b6b"])}"/>`);
  out.push(`<rect x="${rk.x + 30 + 6 * 62}" y="${rk.y + 10}" width="26" height="55" rx="5" fill="none" stroke="#ffd27a" stroke-width="4" stroke-dasharray="6 5"/>`);
  // Panneau de procédure (ouest).
  const pn = C(...m.panel);
  out.push(`<rect x="${pn.x + 30}" y="${pn.y}" width="60" height="${pn.h}" fill="#e8dcc0" stroke="#5a4630" stroke-width="5"/>`);
  out.push(snowflake(pn.x + 60, pn.y + 70, 22, "#2f6fa8"), jaw(pn.x + 60, pn.y + 200, 22, "#7a4a1e"), openCircle(pn.x + 60, pn.y + 330, 22, "#5b2a7a"));
  // Formes de papier sous les poutres.
  for (let i = 0; i < 4; i++) out.push(`<rect x="0" y="${180 + i * 330}" width="${W}" height="22" fill="#3a2616" opacity="0.65"/>`);
  for (let i = 0; i < 18; i++) out.push(`<path transform="translate(${f(120 + r() * (W - 240))},${f(150 + Math.floor(r() * 4) * 330 + 40)}) rotate(${f(r() * 360)})" d="${pick(r, ["M-20,0 a20,20 0 1,0 40,0 a14,14 0 1,1 -40,0", "M-22,0 Q0,-16 22,0 Q0,16 -22,0", "M0,-20 L18,10 L-18,10 Z"])}" fill="#f4ecd8" opacity="0.8" stroke="#8a7a5a" stroke-width="2"/>`);
  for (const [x, y] of m.hazards) out.push(hot(x * G + 50, y * G + 30));
  out.push(walls(W, H, [m.exitSouth, m.doorEast]));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out.join("")}</svg>`;
}

function mapS03() {
  const m = MAPS.S03, W = m.w * G, H = m.h * G, r = rng(303);
  const out = [DEFS, gravel(0, 0, W, H, r)];
  for (const [x, y, w, h] of m.beds) {
    const p = C(x, y, w, h);
    out.push(`<g filter="url(#shadow)"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="url(#plantsTexture)" stroke="#3a2a1c" stroke-width="8" rx="10"/></g>`);
    for (let i = 0; i < (w * h) * 3; i++) {
      const cx = p.x + 30 + r() * (p.w - 60), cy = p.y + 30 + r() * (p.h - 60);
      if (r() < 0.45) {
        // Consommer les mêmes tirages ; le feuillage peint reste dans le bac.
        r(); r(); r();
      } else {
        r(); r();
      }
    }
  }
  const bn = C(...m.bench);
  out.push(`<g filter="url(#shadow)"><rect x="${bn.x}" y="${bn.y + 20}" width="${bn.w}" height="80" fill="url(#wood)" stroke="#3b2414" stroke-width="5"/></g>`);
  const [cx, cy] = m.cooler;
  out.push(`<circle cx="${cx * G + 50}" cy="${cy * G + 50}" r="110" fill="url(#glowB)" opacity="0.6"/>`);
  out.push(`<circle cx="${cx * G + 50}" cy="${cy * G + 50}" r="34" fill="url(#glass)" stroke="#b87333" stroke-width="10"/>`);
  for (const [px, py] of m.pots) out.push(`<circle cx="${px * G + 50}" cy="${py * G + 50}" r="34" fill="url(#terracotta)" stroke="#6a2c10" stroke-width="6"/><circle cx="${px * G + 50}" cy="${py * G + 50}" r="20" fill="url(#plantsTexture)"/>`);
  for (const [x, y, w, h] of m.ribbons) for (let i = 0; i < 4; i++) {
    const p = C(x, y, w, h);
    out.push(`<path d="M${f(p.x + r() * p.w)},${f(p.y + r() * p.h)} c30,-40 60,40 90,0 s60,40 90,0" stroke="#3d6fd8" stroke-width="7" fill="none" opacity="0.9"/>`);
  }
  // Montants de la verrière.
  for (let x = 0; x <= W; x += 250) out.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#d9f1ff" stroke-width="6" opacity="0.18"/>`);
  out.push(walls(W, H, [m.door], "#8fb3bf", 24));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out.join("")}</svg>`;
}

function mapS04() {
  const m = MAPS.S04, W = m.w * G, H = m.h * G, r = rng(404);
  const out = [DEFS, soil(W, H, r, [70, 60, 50])];
  // Sol inférieur (1 m plus bas) couvert de sacs et de matériel.
  for (let i = 0; i < 70; i++) {
    const sx = f(r() * W), sy = f(r() * H), sw = f(50 + r() * 40), sh = f(35 + r() * 25);
    const tint = pick(r, ["#b9a27c", "#a48d68", "#c8b28a"]), angle = f(r() * 40 - 20);
    out.push(`<g transform="rotate(${angle})" opacity="0.9"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="16" fill="url(#sacking)" stroke="#6b5a40" stroke-width="3"/><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="16" fill="${tint}" opacity="0.65"/><path d="M${sx + 8},${sy + sh / 2} Q${sx + sw / 2},${sy + sh / 2 + 6} ${sx + sw - 8},${sy + sh / 2}" stroke="#806444" stroke-width="1.5" stroke-dasharray="2 3" fill="none"/></g>`);
  }
  // Verrière embuée au nord, ombre du phénix derrière.
  out.push(`<rect x="0" y="0" width="${W}" height="70" fill="url(#glass)"/>`, `<ellipse cx="${W * 0.35}" cy="40" rx="260" ry="60" fill="url(#glowO)" opacity="0.6"/>`);
  for (let x = 0; x < W; x += 140) out.push(`<line x1="${x}" y1="0" x2="${x}" y2="70" stroke="#5a6a70" stroke-width="6"/>`);
  const wk = C(...m.walkway);
  out.push(`<g filter="url(#shadow)"><rect x="${wk.x}" y="${wk.y}" width="${wk.w}" height="${wk.h}" fill="#8a5c34"/></g>`);
  for (let x = wk.x; x < wk.x + wk.w; x += 26) {
    r();
    out.push(`<rect x="${x}" y="${wk.y}" width="24" height="${wk.h}" fill="url(#wood)" stroke="#4a3322" stroke-width="0.8"/>`);
  }
  const [bx, by, bl] = m.brokenRail;
  out.push(`<rect x="${wk.x}" y="${wk.y - 8}" width="${wk.w}" height="14" fill="#3a2414"/>`);
  out.push(`<rect x="${wk.x}" y="${wk.y + wk.h - 6}" width="${bx * G - wk.x}" height="14" fill="#3a2414"/>`, `<rect x="${(bx + bl) * G}" y="${wk.y + wk.h - 6}" width="${wk.x + wk.w - (bx + bl) * G}" height="14" fill="#3a2414"/>`);
  out.push(`<path d="M${bx * G},${by * G} l30,25 l-10,20 M${(bx + bl) * G},${by * G} l-25,30" stroke="#3a2414" stroke-width="10" fill="none"/>`);
  const n = C(...m.niche);
  out.push(`<g filter="url(#shadow)"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="url(#wood)" stroke="#3a2414" stroke-width="8"/></g>`);
  out.push(`<rect x="${n.x + 150}" y="${n.y + 180}" width="200" height="140" rx="30" fill="#6b2f3a" opacity="0.85"/>`, lantern(n.x + 300, n.y + 90, "O", 90));
  const cb = C(...m.cupboard), cr = C(...m.crate);
  out.push(`<rect x="${cb.x}" y="${cb.y + 10}" width="${cb.w}" height="${cb.h - 10}" fill="url(#wood)" stroke="#24170d" stroke-width="6" filter="url(#shadow)"/>`);
  out.push(`<rect x="${cr.x}" y="${cr.y}" width="${cr.w}" height="${cr.h - 10}" fill="url(#wood)" stroke="#4a3622" stroke-width="6" filter="url(#shadow)"/><path d="M${cr.x},${cr.y} L${cr.x + cr.w},${cr.y + cr.h - 10} M${cr.x + cr.w},${cr.y} L${cr.x},${cr.y + cr.h - 10}" stroke="#4a3622" stroke-width="5"/>`);
  out.push(walls(W, H, [[0, 3, 1, 2]], "#3b322b", 26));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out.join("")}</svg>`;
}

function snowflake(x, y, s, color) {
  const arms = [0, 60, 120].map(a => `<line x1="${-s}" y1="0" x2="${s}" y2="0" transform="rotate(${a})"/>`).join("");
  const ticks = [0, 60, 120, 180, 240, 300].map(a => `<path d="M${s * 0.6},0 l${s * 0.3},${-s * 0.3} M${s * 0.6},0 l${s * 0.3},${s * 0.3}" transform="rotate(${a})"/>`).join("");
  return `<g transform="translate(${x},${y})" stroke="${color}" stroke-width="${Math.max(3, s / 6)}" stroke-linecap="round" fill="none">${arms}${ticks}</g>`;
}
function jaw(x, y, s, color) {
  return `<g transform="translate(${x},${y})" stroke="${color}" stroke-width="${Math.max(3, s / 6)}" fill="none" stroke-linecap="round"><path d="M${-s},${-s * 0.2} L${-s},${-s} L${s},${-s} L${s},${-s * 0.2}"/><path d="M${-s},${s * 0.2} L${-s},${s} L${s},${s} L${s},${s * 0.2}"/>${[-0.5, 0, 0.5].map(k => `<path d="M${k * s},${-s} l${-s * 0.15},${s * 0.45} M${k * s},${s} l${s * 0.15},${-s * 0.45}"/>`).join("")}</g>`;
}
function openCircle(x, y, s, color) {
  return `<g transform="translate(${x},${y})" stroke="${color}" stroke-width="${Math.max(3, s / 5)}" fill="none" stroke-linecap="round"><path d="M${s * 0.7},${-s * 0.7} A${s},${s} 0 1,0 ${s},0"/></g>`;
}

function mapS05(state) {
  const m = MAPS.S05, W = m.w * G, H = m.h * G, r = rng(505), lit = state === "allumee";
  const out = [DEFS, plates(W, H, r)];
  const ph = C(...m.phoenix), cx = ph.x + ph.w / 2, cy = ph.y + ph.h / 2;
  const tank = C(...m.tank), fl = C(...m.flange), sel = C(...m.selector);
  out.push(pipe([[cx, cy], [tank.x + tank.w, cy]], 22, { danger: lit }));
  out.push(pipe([[cx, cy], [cx, fl.y + fl.h]], 22, { danger: lit }));
  out.push(pipe([[cx, cy], [sel.x, cy]], 18, { danger: lit }));
  out.push(pipe([[cx + 60, cy + 120], [cx + 60, 1500], [m.valve[0] * G + 50, m.valve[1] * G + 50]], 16));
  out.push(`<rect x="${ph.x - 30}" y="${ph.y - 30}" width="${ph.w + 60}" height="${ph.h + 60}" rx="40" fill="#2a2420" stroke="#8a6a3a" stroke-width="10"/>`);
  for (let i = 0; i <= 8; i++) out.push(`<line x1="${ph.x - 30 + i * (ph.w + 60) / 8}" y1="${ph.y - 30}" x2="${ph.x - 30 + i * (ph.w + 60) / 8}" y2="${ph.y + ph.h + 30}" stroke="#8a6a3a" stroke-width="4" opacity="0.6"/>`);
  out.push(phoenixTop(cx, cy + 30, 360, { lit, flutter: lit ? 1 : 0 }));
  // Cuve (flocon), raccord à bride (mâchoire), sélecteur (cercle ouvert).
  out.push(`<g filter="url(#shadow)"><rect x="${tank.x}" y="${tank.y}" width="${tank.w}" height="${tank.h}" rx="40" fill="#2f5f7a" stroke="#1a3242" stroke-width="10"/></g>`);
  out.push(`<rect x="${tank.x + 30}" y="${tank.y + 30}" width="${tank.w - 60}" height="${tank.h - 60}" rx="24" fill="url(#glass)"/>`, snowflake(tank.x + tank.w / 2, tank.y + tank.h / 2, 70, "#ffffff"));
  out.push(`<g filter="url(#shadow)"><rect x="${fl.x}" y="${fl.y}" width="${fl.w}" height="${fl.h}" rx="20" fill="#5a3a22" stroke="#24170d" stroke-width="10"/></g>`, jaw(fl.x + fl.w / 2, fl.y + fl.h / 2, 60, "#ffd27a"));
  out.push(`<g filter="url(#shadow)"><rect x="${sel.x}" y="${sel.y}" width="${sel.w}" height="${sel.h}" rx="30" fill="#3d2a4a" stroke="#1d1424" stroke-width="10"/></g>`, openCircle(sel.x + sel.w / 2, sel.y + sel.h / 2, 70, "#e8d0ff"));
  out.push(label(tank.x + tank.w / 2, tank.y + tank.h + 60, "FLOCON", 40), label(tank.x + tank.w / 2, tank.y + tank.h + 120, "REFROIDIR", 40));
  out.push(label(fl.x + fl.w / 2, fl.y + fl.h + 70, "MÂCHOIRE — ISOLER", 40));
  out.push(label(sel.x + sel.w / 2, sel.y + sel.h + 60, "CERCLE OUVERT", 36), label(sel.x + sel.w / 2, sel.y + sel.h + 115, "DÉSENCHANTER", 36));
  // Palan et contrepoids.
  const [hx, hy] = m.hoist, [kx, ky] = m.counterweight;
  out.push(`<rect x="${hx * G - 40}" y="${hy * G + 30}" width="300" height="40" fill="#5b5048" stroke="#2a2420" stroke-width="5"/>`);
  out.push(`<line x1="${hx * G + 220}" y1="${hy * G + 50}" x2="${kx * G + 50}" y2="${ky * G + 20}" stroke="#c8c0b0" stroke-width="6" stroke-dasharray="10 6"/>`);
  out.push(`<rect x="${kx * G + 10}" y="${ky * G + 10}" width="80" height="80" rx="8" fill="#3a3a3a" stroke="#141414" stroke-width="6" filter="url(#shadow)"/>`, label(kx * G + 50, ky * G + 140, "18 kg", 32));
  // Vanne de Wren et sortie.
  const [vx, vy] = m.valve;
  out.push(`<circle cx="${vx * G + 50}" cy="${vy * G + 50}" r="42" fill="none" stroke="#b33a2a" stroke-width="12"/>`);
  for (const a of [0, 60, 120]) out.push(`<line x1="${vx * G + 8}" y1="${vy * G + 50}" x2="${vx * G + 92}" y2="${vy * G + 50}" stroke="#b33a2a" stroke-width="8" transform="rotate(${a} ${vx * G + 50} ${vy * G + 50})"/>`);
  out.push(label(vx * G + 50, vy * G + 140, "VANNE", 34));
  if (lit) out.push(steam(cx, fl.y + fl.h + 120, 70, 4, 7), steam(tank.x + tank.w + 100, cy, 60, 3, 8), label(cx - 330, cy + 300, "DANGER", 40, { color: "#ffe08a" }));
  if (!lit) out.push(`<rect width="${W}" height="${H}" fill="#0c1020" opacity="0.35"/>`);
  out.push(walls(W, H, [m.exit]));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out.join("")}</svg>`;
}

const MAP_DRAW = { S01: mapS01, S02: mapS02, S03: mapS03, S04: mapS04, S05: mapS05 };

/* -------------------------------------------- */
/*  Portraits                                   */
/* -------------------------------------------- */

const PEOPLE = {
  alix: { house: "gryffindor", skin: "#e8b48f", hair: "#3b2a1f", hairStyle: "messy", eyes: "#3f7a45", mouth: "grin", freckles: true, bg: ["#5a2a14", "#c26b2c"] },
  noor: { house: "ravenclaw", skin: "#a8714b", hair: "#1b1412", hairStyle: "long", eyes: "#3a2414", mouth: "soft", glasses: "rect", bg: ["#16223f", "#4c6aa0"] },
  malo: { house: "hufflepuff", skin: "#f1c7a5", hair: "#8a5a2b", hairStyle: "curly", eyes: "#5a7a3a", mouth: "smile", leaf: true, bg: ["#3e3216", "#a88a3a"] },
  iris: { house: "slytherin", skin: "#f3d6c2", hair: "#e6d7ae", hairStyle: "bob", eyes: "#6b8aa0", mouth: "smirk", bg: ["#12301f", "#4f7a5a"] },
  tom: { house: "gryffindor", skin: "#7a4b2e", hair: "#16100c", hairStyle: "short", eyes: "#3a2414", mouth: "grin", screw: true, bg: ["#4a1e10", "#b8642a"] },
  wren: { adult: true, skin: "#e2b998", hair: "#c9c6c0", hairStyle: "bun", eyes: "#7a6a3a", mouth: "smile", apron: "#5b2a7a", wrinkles: true, bg: ["#2e1a36", "#8a5aa0"] },
  basile: { house: "slytherin", skin: "#efcfb4", hair: "#2a1d14", hairStyle: "parted", eyes: "#4a5a6a", mouth: "flat", bandage: true, bg: ["#10261a", "#3e5a48"] },
  maelle: { house: "hufflepuff", skin: "#f4d2b8", hair: "#9a4a24", hairStyle: "braids", eyes: "#5a7a3a", mouth: "smile", glasses: "round", freckles: true, bg: ["#3a2e12", "#b89a3a"] },
};

function tokenSVG(inner, ring, size = 400) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 400 400">
    <defs><clipPath id="c"><circle cx="200" cy="200" r="184"/></clipPath></defs>
    <g clip-path="url(#c)"><image href="${inner}" x="-40" y="-20" width="480" height="480"/></g>
    <circle cx="200" cy="200" r="186" fill="none" stroke="${ring[0]}" stroke-width="20"/>
    <circle cx="200" cy="200" r="194" fill="none" stroke="${ring[1]}" stroke-width="6"/></svg>`;
}

/* -------------------------------------------- */
/*  Objets, aides, couverture                   */
/* -------------------------------------------- */

function parchment(W, H, seed) {
  const r = rng(seed);
  const spots = Array.from({ length: 30 }, () => `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(10 + r() * 50)}" fill="#a07840" opacity="${f(0.03 + r() * 0.05)}"/>`).join("");
  return `<image href="${imageURI("paper")}" width="${W}" height="${H}" preserveAspectRatio="none"/>${spots}<rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="3" fill="none" stroke="#81603a" stroke-width="1.5" opacity="0.65"/>`;
}

function a02SVG() {
  const W = 1200, H = 760;
  const box = (x, n, title, sub, sym) => `<g><rect x="${x}" y="200" width="320" height="380" rx="18" fill="#fff7e6" stroke="#5a4630" stroke-width="5"/>
    <text x="${x + 160}" y="260" font-family="${SERIF}" font-size="32" font-weight="bold" text-anchor="middle" fill="#3a2614">${n} — ${title}</text>${sym}
    ${sub.map((l, i) => `<text x="${x + 160}" y="${490 + i * 38}" font-family="${SERIF}" font-size="30" text-anchor="middle" fill="#3a2614">${l}</text>`).join("")}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parchment(W, H, 22)}
    <text x="${W / 2}" y="110" font-family="${SERIF}" font-size="58" font-weight="bold" text-anchor="middle" fill="#3a2614">Arrêt local du Phénix des Veillées</text>
    ${box(60, 1, "FLOCON", ["Remplir la cuve froide,", "refroidir le raccord"], snowflake(220, 370, 70, "#2f6fa8"))}
    ${box(440, 2, "MÂCHOIRE", ["Poser la bride, lever", "le contrepoids"], jaw(600, 370, 70, "#7a4a1e"))}
    ${box(820, 3, "CERCLE OUVERT", ["Retirer la bague,", "sélecteur sur le cercle"], openCircle(980, 370, 70, "#5b2a7a"))}
    <path d="M386,390 L432,390 M412,374 L432,390 L412,406 M766,390 L812,390 M792,374 L812,390 L792,406" stroke="#3a2614" stroke-width="6" fill="none"/>
    <text x="${W / 2}" y="660" font-family="${SERIF}" font-size="34" font-style="italic" text-anchor="middle" fill="#7a2a1a">Ne jamais arracher une conduite chaude. — A. Wren</text></svg>`;
}

function a03SVG() {
  const W = 900, H = 640, r = rng(33);
  const lines = Array.from({ length: 16 }, (_, i) => `<line x1="40" y1="${70 + i * 36}" x2="${W - 40}" y2="${70 + i * 36}" stroke="#8fb3d8" stroke-width="1.5" opacity="0.6"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <image href="${imageURI("paper")}" width="${W}" height="${H}" preserveAspectRatio="none"/>${lines}<line x1="110" y1="0" x2="110" y2="${H}" stroke="#d88a8a" stroke-width="2"/>
    <ellipse cx="690" cy="470" rx="170" ry="120" fill="#a0703a" opacity="${f(0.16 + r() * 0.04)}"/>
    <g stroke="#3a3a46" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M200,180 L200,300 L300,300 L300,250 L260,250 L260,180"/><path d="M640,180 L640,300 L540,300 L540,250 L580,250 L580,180"/>
      <circle cx="420" cy="420" r="58"/><path d="M420,362 L420,420 L470,420"/>
      <path d="M520,520 Q470,500 448,454 M448,454 l4,26 M448,454 l22,10"/>
      <path d="M300,276 L380,276 M540,276 L460,276"/>
    </g>
    <text x="250" y="150" font-family="${SERIF}" font-style="italic" font-size="34" fill="#3a3a46" text-anchor="middle">encoche</text>
    <text x="590" y="150" font-family="${SERIF}" font-style="italic" font-size="34" fill="#3a3a46" text-anchor="middle">encoche</text>
    <text x="480" y="560" font-family="${SERIF}" font-style="italic" font-size="27" fill="#3a3a46">loquet : fermer vers l’intérieur</text></svg>`;
}

function coverSVG(W = 1600, H = 900) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="titleShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#080c14" stop-opacity="0"/><stop offset="0.35" stop-color="#080c14" stop-opacity="0.72"/><stop offset="1" stop-color="#080c14" stop-opacity="0.96"/></linearGradient></defs>
    <image href="${imageURI("cover")}" width="${W}" height="${H}" preserveAspectRatio="none"/>
    <rect y="660" width="${W}" height="240" fill="url(#titleShade)"/>
    <path d="M560,726 H1040" stroke="#ca9b5e" stroke-width="1"/>
    <text x="800" y="805" font-family="${SERIF}" font-size="77" font-weight="bold" text-anchor="middle" fill="#ffe7ba">La Nuit des lanternes indociles</text>
    <text x="800" y="858" font-family="${SERIF}" font-size="29" letter-spacing="2" text-anchor="middle" fill="#d6c2a3">One shot Harry Potter JdR · Halloween 1988</text></svg>`;
}

const jobs = [];
for (const [code, map] of Object.entries(MAPS)) {
  for (const state of map.states) jobs.push(write(MAP_DRAW[code](state), `maps/${map.file}-${state}.webp`, { quality: 90 }));
  jobs.push(write(MAP_DRAW[code](map.states[0]), `maps/thumbs/${map.file}.webp`, { width: 300, height: Math.round(300 * map.h / map.w), quality: 82 }));
}
const RINGS = { gryffindor: ["#7f0909", "#e8b20e"], slytherin: ["#1a472a", "#c0c0c0"], ravenclaw: ["#0e1a40", "#a8783a"], hufflepuff: ["#e1a92e", "#2b2420"] };
for (const key of [...Object.keys(PEOPLE), "cerf"]) {
  jobs.push(sharp(artwork(key)).resize(512, 512).webp({quality:94}).toFile(path.join(OUT, `portraits/${key}.webp`)));
  const house = PEOPLE[key]?.house;
  const ring = key === "cerf" ? ["#6b4424", "#d8c8a0"] : house ? RINGS[house] : ["#5b2a7a", "#e8c06a"];
  jobs.push(write(tokenSVG(imageURI(key), ring), `tokens/${key}.webp`));
}
for (const key of ["bride", "refroidisseur"]) jobs.push(write(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><defs><clipPath id="item"><rect width="256" height="256" rx="24"/></clipPath></defs><image href="${imageURI(key)}" width="256" height="256" clip-path="url(#item)"/></svg>`, `items/${key}.webp`, {quality:94}));
jobs.push(write(a02SVG(), "handouts/a02-schema.webp"), write(a03SVG(), "handouts/a03-croquis.webp"));
const cover = coverSVG();
jobs.push(write(cover, "art/cover.webp"), write(cover, "art/cover-thumb.webp", { width: 400, height: 225, quality: 78 }));
const files = await Promise.all(jobs);
console.log(`${files.length} images générées dans assets/.`);
