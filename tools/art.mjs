// Génère toutes les images du module en SVG puis les convertit en WebP (sharp) :
// cartes (avec leurs états), portraits, tokens, objets, aides illustrées et couverture.
// Tout est dessiné par programme : aucune image externe n'est utilisée.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { MAPS, GRID } from "./layout.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "assets");
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

async function write(svg, file, { width, height, quality = 86 } = {}) {
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
  return out.join("");
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
  return out.join("");
}

function soil(W, H, r, base = [96, 72, 48]) {
  const out = [`<rect width="${W}" height="${H}" fill="rgb(${base.join(",")})"/>`];
  for (let i = 0; i < (W * H) / 900; i++) {
    const c = base.map(v => Math.round(v + (r() - 0.5) * 40));
    out.push(`<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(1.5 + r() * 4)}" fill="rgb(${c.join(",")})" opacity="0.7"/>`);
  }
  return out.join("");
}

function gravel(x, y, w, h, r) {
  const out = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#a39a88"/>`];
  for (let i = 0; i < (w * h) / 260; i++) {
    out.push(`<circle cx="${f(x + r() * w)}" cy="${f(y + r() * h)}" r="${f(2 + r() * 3.5)}" fill="${pick(r, ["#8e8574", "#b8af9c", "#9c927f", "#c4bba7"])}"/>`);
  }
  return out.join("");
}

function plates(W, H, r) {
  const out = [`<rect width="${W}" height="${H}" fill="#4b4540"/>`];
  for (let y = 0; y < H; y += 150) for (let x = 0; x < W; x += 150) {
    const d = (r() - 0.5) * 14;
    out.push(`<rect x="${x + 3}" y="${y + 3}" width="144" height="144" fill="rgb(${[86 + d, 78 + d, 70 + d].map(Math.round).join(",")})" stroke="#2f2a26" stroke-width="2"/>`);
    for (const [dx, dy] of [[12, 12], [138, 12], [12, 138], [138, 138]]) out.push(`<circle cx="${x + dx}" cy="${y + dy}" r="4" fill="#9a8f80"/>`);
  }
  return out.join("");
}

/* -------------------------------------------- */
/*  Éléments communs                            */
/* -------------------------------------------- */

const DEFS = `<defs>
  <radialGradient id="glowO"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.95"/><stop offset="0.35" stop-color="#ff9a3c" stop-opacity="0.55"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowB"><stop offset="0" stop-color="#d8ecff" stop-opacity="0.95"/><stop offset="0.35" stop-color="#7fb2ff" stop-opacity="0.5"/><stop offset="1" stop-color="#4f7fd8" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowR"><stop offset="0" stop-color="#fff0c0"/><stop offset="0.4" stop-color="#ff7a2a" stop-opacity="0.8"/><stop offset="1" stop-color="#c4380c" stop-opacity="0"/></radialGradient>
  <radialGradient id="steam"><stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
  <linearGradient id="copper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2b67a"/><stop offset="0.5" stop-color="#c47a3c"/><stop offset="1" stop-color="#7c4119"/></linearGradient>
  <linearGradient id="copperDark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9b6236"/><stop offset="1" stop-color="#4e2a12"/></linearGradient>
  <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a6a3c"/><stop offset="1" stop-color="#6b4424"/></linearGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9f1ff" stop-opacity="0.75"/><stop offset="1" stop-color="#7fb7d6" stop-opacity="0.45"/></linearGradient>
  <pattern id="hazard" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="40" height="40" fill="#f2c230" opacity="0.55"/><rect width="20" height="40" fill="#1d1d1d" opacity="0.55"/></pattern>
  <pattern id="grate" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#2a2420"/><rect x="2" y="2" width="12" height="12" fill="#5a5048"/></pattern>
  <filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="6" dy="8" stdDeviation="6" flood-color="#000" flood-opacity="0.45"/></filter>
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

function phoenixTop(cx, cy, size, { lit = true, flutter = 0 } = {}) {
  const out = [];
  const s = size / 400;
  if (lit) out.push(`<circle cx="${cx}" cy="${cy}" r="${size * 0.75}" fill="url(#glowO)" opacity="0.55"/>`);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const ang = (-50 + i * 11 + flutter * (i % 2 ? 6 : -6)) * Math.PI / 180;
      const len = (150 + (i < 5 ? i * 12 : (8 - i) * 14)) * s;
      const bx = cx + side * 30 * s, by = cy - 10 * s;
      const tx = bx + side * Math.cos(ang) * len, ty = by + Math.sin(ang) * len;
      const nx = -Math.sin(ang) * 16 * s, ny = Math.cos(ang) * 16 * s;
      out.push(`<path d="M${f(bx)},${f(by)} L${f(tx + side * nx)},${f(ty + ny)} L${f(tx + side * Math.cos(ang) * 14 * s)},${f(ty + Math.sin(ang) * 14 * s)} L${f(tx - side * nx)},${f(ty - ny)} Z" fill="url(#copper)" stroke="#4e2a12" stroke-width="${f(3 * s + 1)}"/>`);
    }
  }
  for (let i = 0; i < 7; i++) {
    const ang = (60 + i * 10) * Math.PI / 180;
    const len = (140 + (3 - Math.abs(i - 3)) * 20) * s;
    out.push(`<path d="M${cx},${f(cy + 40 * s)} L${f(cx + Math.cos(ang) * len - 10 * s)},${f(cy + 40 * s + Math.sin(ang) * len)} L${f(cx + Math.cos(ang) * len + 10 * s)},${f(cy + 40 * s + Math.sin(ang) * len)} Z" fill="url(#copperDark)" stroke="#3a1f0c" stroke-width="${f(3 * s + 1)}"/>`);
  }
  out.push(`<ellipse cx="${cx}" cy="${cy}" rx="${f(55 * s)}" ry="${f(95 * s)}" fill="url(#copper)" stroke="#3a1f0c" stroke-width="${f(4 * s + 1)}"/>`);
  out.push(`<circle cx="${cx}" cy="${f(cy - 105 * s)}" r="${f(36 * s)}" fill="url(#copper)" stroke="#3a1f0c" stroke-width="${f(4 * s + 1)}"/>`);
  out.push(`<path d="M${f(cx - 12 * s)},${f(cy - 132 * s)} L${cx},${f(cy - 170 * s)} L${f(cx + 12 * s)},${f(cy - 132 * s)} Z" fill="#e8c06a" stroke="#3a1f0c" stroke-width="2"/>`);
  out.push(`<circle cx="${cx}" cy="${f(cy + 5 * s)}" r="${f(30 * s)}" fill="${lit ? "url(#glowR)" : "#4a3a30"}" stroke="#2a1608" stroke-width="${f(5 * s)}"/>`);
  out.push(`<circle cx="${cx}" cy="${f(cy + 5 * s)}" r="${f(30 * s)}" fill="none" stroke="#2a1608" stroke-width="${f(3 * s)}" stroke-dasharray="${f(6 * s)} ${f(6 * s)}"/>`);
  return out.join("");
}

/* -------------------------------------------- */
/*  Cartes                                      */
/* -------------------------------------------- */

function stall({ rect: [x, y, w, h] }, kind, r, tipped = false) {
  const p = C(x, y, w, h);
  const out = [`<g filter="url(#shadow)"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="url(#wood)" stroke="#3b2414" stroke-width="5" rx="6"/>`];
  const stripes = Math.floor(p.w / 40);
  for (let i = 0; i < stripes; i += 2) out.push(`<rect x="${p.x + i * 40}" y="${p.y}" width="40" height="34" fill="${kind === "courges" ? "#3e7d4a" : kind === "poissons" ? "#3d5fa8" : "#a63a2c"}" opacity="0.9"/>`);
  out.push("</g>");
  const items = [];
  for (let i = 0; i < 7; i++) {
    const ix = p.x + 30 + r() * (p.w - 60), iy = p.y + 60 + r() * (p.h - 90);
    if (kind === "courges") items.push(`<circle cx="${f(ix)}" cy="${f(iy)}" r="${f(18 + r() * 8)}" fill="#e07a1f" stroke="#7a3a0a" stroke-width="3"/><path d="M${f(ix)},${f(iy - 20)} q4,-10 10,-12" stroke="#3e7d4a" stroke-width="4" fill="none"/>`);
    if (kind === "poissons") items.push(`<path transform="translate(${f(ix)},${f(iy)}) rotate(${f(r() * 360)})" d="M-22,0 Q0,-14 18,0 Q0,14 -22,0 Z M18,0 L30,-10 L30,10 Z" fill="${pick(r, ["#f4e2b8", "#bfe0ff", "#ffd0a0"])}" stroke="#5a4a3a" stroke-width="2"/>`);
    if (kind === "pommes") items.push(`<circle cx="${f(ix)}" cy="${f(iy)}" r="12" fill="#b3261e" stroke="#5a1410" stroke-width="2"/><circle cx="${f(ix - 4)}" cy="${f(iy - 4)}" r="4" fill="#f0c070" opacity="0.8"/>`);
  }
  if (tipped && kind === "courges") {
    return `<g transform="rotate(-18 ${p.x + p.w / 2} ${p.y + p.h / 2})">${out.join("")}</g>${items.map((it, i) => `<g transform="translate(${f((r() - 0.2) * 160)},${f(80 + r() * 120)})">${it}</g>`).join("")}`;
  }
  return out.join("") + items.join("");
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
  out.push(`<circle cx="${pcx}" cy="${pcy}" r="${ph.w / 2}" fill="#8d8273" stroke="#4b4239" stroke-width="10" filter="url(#shadow)"/>`);
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
    out.push(`<g filter="url(#shadow)"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#5b4330" stroke="#3a2a1c" stroke-width="8" rx="10"/></g>`);
    for (let i = 0; i < (w * h) * 3; i++) {
      const cx = p.x + 30 + r() * (p.w - 60), cy = p.y + 30 + r() * (p.h - 60);
      if (r() < 0.45) {
        out.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(10 + r() * 8)}" ry="${f(40 + r() * 20)}" transform="rotate(${f(r() * 180)} ${f(cx)} ${f(cy)})" fill="#cdeee6" opacity="0.65" stroke="#7fb7a6" stroke-width="2"/>`);
      } else {
        out.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(14 + r() * 16)}" fill="${pick(r, ["#4f7d3a", "#5f9145", "#3e6b30"])}" opacity="0.95"/>`);
      }
    }
  }
  const bn = C(...m.bench);
  out.push(`<g filter="url(#shadow)"><rect x="${bn.x}" y="${bn.y + 20}" width="${bn.w}" height="80" fill="url(#wood)" stroke="#3b2414" stroke-width="5"/></g>`);
  const [cx, cy] = m.cooler;
  out.push(`<circle cx="${cx * G + 50}" cy="${cy * G + 50}" r="110" fill="url(#glowB)" opacity="0.6"/>`);
  out.push(`<circle cx="${cx * G + 50}" cy="${cy * G + 50}" r="34" fill="url(#glass)" stroke="#b87333" stroke-width="10"/>`);
  for (const [px, py] of m.pots) out.push(`<circle cx="${px * G + 50}" cy="${py * G + 50}" r="34" fill="#b5562a" stroke="#6a2c10" stroke-width="6"/><circle cx="${px * G + 50}" cy="${py * G + 50}" r="20" fill="#4f7d3a"/>`);
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
  for (let i = 0; i < 70; i++) out.push(`<rect x="${f(r() * W)}" y="${f(r() * H)}" width="${f(50 + r() * 40)}" height="${f(35 + r() * 25)}" rx="16" fill="${pick(r, ["#b9a27c", "#a48d68", "#c8b28a"])}" stroke="#6b5a40" stroke-width="3" transform="rotate(${f(r() * 40 - 20)})" opacity="0.9"/>`);
  // Verrière embuée au nord, ombre du phénix derrière.
  out.push(`<rect x="0" y="0" width="${W}" height="70" fill="url(#glass)"/>`, `<ellipse cx="${W * 0.35}" cy="40" rx="260" ry="60" fill="url(#glowO)" opacity="0.6"/>`);
  for (let x = 0; x < W; x += 140) out.push(`<line x1="${x}" y1="0" x2="${x}" y2="70" stroke="#5a6a70" stroke-width="6"/>`);
  const wk = C(...m.walkway);
  out.push(`<g filter="url(#shadow)"><rect x="${wk.x}" y="${wk.y}" width="${wk.w}" height="${wk.h}" fill="#8a5c34"/></g>`);
  for (let x = wk.x; x < wk.x + wk.w; x += 26) out.push(`<rect x="${x}" y="${wk.y}" width="24" height="${wk.h}" fill="${pick(r, ["#8f6038", "#7d5230", "#94663c"])}"/>`);
  const [bx, by, bl] = m.brokenRail;
  out.push(`<rect x="${wk.x}" y="${wk.y - 8}" width="${wk.w}" height="14" fill="#3a2414"/>`);
  out.push(`<rect x="${wk.x}" y="${wk.y + wk.h - 6}" width="${bx * G - wk.x}" height="14" fill="#3a2414"/>`, `<rect x="${(bx + bl) * G}" y="${wk.y + wk.h - 6}" width="${wk.x + wk.w - (bx + bl) * G}" height="14" fill="#3a2414"/>`);
  out.push(`<path d="M${bx * G},${by * G} l30,25 l-10,20 M${(bx + bl) * G},${by * G} l-25,30" stroke="#3a2414" stroke-width="10" fill="none"/>`);
  const n = C(...m.niche);
  out.push(`<g filter="url(#shadow)"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="#7a5232" stroke="#3a2414" stroke-width="8"/></g>`);
  out.push(`<rect x="${n.x + 150}" y="${n.y + 180}" width="200" height="140" rx="30" fill="#6b2f3a" opacity="0.85"/>`, lantern(n.x + 300, n.y + 90, "O", 90));
  const cb = C(...m.cupboard), cr = C(...m.crate);
  out.push(`<rect x="${cb.x}" y="${cb.y + 10}" width="${cb.w}" height="${cb.h - 10}" fill="#5a3a22" stroke="#24170d" stroke-width="6" filter="url(#shadow)"/>`);
  out.push(`<rect x="${cr.x}" y="${cr.y}" width="${cr.w}" height="${cr.h - 10}" fill="#9a7a4a" stroke="#4a3622" stroke-width="6" filter="url(#shadow)"/><path d="M${cr.x},${cr.y} L${cr.x + cr.w},${cr.y + cr.h - 10} M${cr.x + cr.w},${cr.y} L${cr.x},${cr.y + cr.h - 10}" stroke="#4a3622" stroke-width="5"/>`);
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

const HOUSE = {
  gryffindor: ["#7f0909", "#e8b20e"], slytherin: ["#1a472a", "#b8b8b8"],
  ravenclaw: ["#0e1a40", "#a8783a"], hufflepuff: ["#e1a92e", "#2b2420"],
};

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

function hairBack(p) {
  const c = p.hair;
  if (p.hairStyle === "long") return `<path d="M150,200 Q140,420 170,470 L342,470 Q372,420 362,200 Z" fill="${c}"/>`;
  if (p.hairStyle === "braids") return `<g fill="${c}">${[160, 352].map(x => `<rect x="${x - 18}" y="250" width="36" height="200" rx="18"/>${[290, 340, 390].map(y => `<path d="M${x - 18},${y} q18,14 36,0" stroke="#5a2a10" stroke-width="3" fill="none"/>`).join("")}`).join("")}</g>`;
  if (p.hairStyle === "bob") return `<path d="M150,190 Q146,330 176,350 L336,350 Q366,330 362,190 Z" fill="${c}"/>`;
  if (p.hairStyle === "bun") return `<circle cx="256" cy="92" r="46" fill="${c}"/><circle cx="256" cy="92" r="46" fill="none" stroke="#8a8680" stroke-width="3"/>`;
  return "";
}

function hairFront(p) {
  const c = p.hair;
  switch (p.hairStyle) {
    case "messy": return `<path d="M164,200 Q160,110 256,104 Q352,110 348,200 L330,170 L318,196 L300,160 L282,190 L262,150 L242,188 L222,156 L204,192 L188,164 Z" fill="${c}"/>`;
    case "long": return `<path d="M160,215 Q158,110 256,104 Q354,110 352,215 Q320,150 256,148 Q200,150 160,215 Z" fill="${c}"/>`;
    case "curly": return `<g fill="${c}">${Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (1.05 + i * 0.075); return `<circle cx="${f(256 + Math.cos(a) * 100)}" cy="${f(205 + Math.sin(a) * 100)}" r="30"/>`; }).join("")}<circle cx="256" cy="118" r="40"/></g>`;
    case "bob": return `<path d="M158,220 Q156,108 256,102 Q356,108 354,220 Q330,150 256,140 L250,175 Q200,160 158,220 Z" fill="${c}"/>`;
    case "short": return `<path d="M168,190 Q166,118 256,110 Q346,118 344,190 Q300,150 256,150 Q212,150 168,190 Z" fill="${c}"/>${Array.from({ length: 12 }, (_, i) => `<circle cx="${180 + i * 14}" cy="${148 - Math.sin(i / 11 * Math.PI) * 26}" r="9" fill="${c}"/>`).join("")}`;
    case "parted": return `<path d="M160,205 Q160,110 256,104 Q352,110 352,205 Q336,160 300,148 Q240,140 196,170 Q176,180 160,205 Z" fill="${c}"/><path d="M226,108 Q232,130 216,160" stroke="#000" stroke-opacity="0.3" stroke-width="3" fill="none"/>`;
    case "bun": return `<path d="M162,205 Q160,112 256,108 Q352,112 350,205 Q330,150 256,146 Q182,150 162,205 Z" fill="${c}"/>${[0, 1, 2, 3].map(i => `<path d="M${190 + i * 40},${130 + (i % 2) * 6} q10,20 0,40" stroke="#8a8680" stroke-width="3" fill="none"/>`).join("")}`;
    case "braids": return `<path d="M160,215 Q158,108 256,104 Q354,108 352,215 Q330,150 256,146 Q182,150 160,215 Z" fill="${c}"/>`;
    default: return "";
  }
}

function mouthPath(kind) {
  switch (kind) {
    case "grin": return `<path d="M222,300 Q256,336 290,300 Q256,316 222,300 Z" fill="#7a2a2a" stroke="#5a1a1a" stroke-width="3"/><path d="M230,303 Q256,314 282,303" stroke="#fff" stroke-width="5" fill="none"/>`;
    case "smile": return `<path d="M228,302 Q256,326 284,302" stroke="#7a3a2a" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    case "soft": return `<path d="M234,304 Q256,318 278,304" stroke="#7a3a2a" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    case "smirk": return `<path d="M232,308 Q262,314 286,296" stroke="#7a3a2a" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    default: return `<path d="M236,308 L278,306" stroke="#7a3a2a" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  }
}

function personSVG(key) {
  const p = PEOPLE[key];
  const [houseA, houseB] = p.house ? HOUSE[p.house] : ["#5b2a7a", "#d8b0e8"];
  const r = rng(key.length * 97 + key.charCodeAt(0));
  const out = [];
  out.push(hairBack(p));
  // Buste : robe, chemise, cravate ou tablier.
  out.push(`<path d="M86,512 Q96,392 196,370 L316,370 Q416,392 426,512 Z" fill="#1e1a1c"/>`);
  out.push(`<path d="M206,372 L256,440 L306,372 Z" fill="#f0ece4"/>`);
  if (p.apron) {
    out.push(`<path d="M170,512 L184,404 Q256,428 328,404 L342,512 Z" fill="${p.apron}"/>`);
    for (let i = 0; i < 6; i++) out.push(`<ellipse cx="${f(200 + r() * 110)}" cy="${f(430 + r() * 70)}" rx="${f(6 + r() * 8)}" ry="${f(4 + r() * 5)}" fill="#2a1424" opacity="0.6"/>`);
  } else {
    out.push(`<path d="M244,384 L268,384 L276,470 L256,500 L236,470 Z" fill="${houseA}"/>`);
    for (let i = 0; i < 4; i++) out.push(`<path d="M${238 + i * 2},${400 + i * 24} L${274 - i * 2},${388 + i * 24}" stroke="${houseB}" stroke-width="6"/>`);
    out.push(`<circle cx="150" cy="450" r="22" fill="${houseA}" stroke="${houseB}" stroke-width="5"/>`);
  }
  if (p.bandage) out.push(`<rect x="340" y="452" width="70" height="40" rx="12" fill="#f4efe6" stroke="#b8b0a0" stroke-width="3"/><path d="M350,462 L400,482 M352,480 L398,466" stroke="#b8b0a0" stroke-width="2"/>`);
  // Cou, oreilles, visage.
  out.push(`<rect x="226" y="300" width="60" height="84" rx="20" fill="${p.skin}"/><rect x="226" y="350" width="60" height="22" fill="#000" opacity="0.12"/>`);
  out.push(`<ellipse cx="160" cy="232" rx="18" ry="28" fill="${p.skin}"/><ellipse cx="352" cy="232" rx="18" ry="28" fill="${p.skin}"/>`);
  out.push(`<ellipse cx="256" cy="222" rx="96" ry="118" fill="${p.skin}"/>`);
  out.push(`<ellipse cx="256" cy="222" rx="96" ry="118" fill="url(#shade)"/>`);
  // Yeux, sourcils, nez, joues, bouche.
  for (const x of [218, 294]) {
    out.push(`<ellipse cx="${x}" cy="230" rx="21" ry="13" fill="#fbf8f2"/><circle cx="${x + 2}" cy="231" r="10" fill="${p.eyes}"/><circle cx="${x + 2}" cy="231" r="5" fill="#111"/><circle cx="${x + 5}" cy="227" r="3" fill="#fff"/>`);
    out.push(`<path d="M${x - 22},228 Q${x},214 ${x + 22},228" stroke="#2a1a14" stroke-width="3.5" fill="none"/>`);
    out.push(`<path d="M${x - 24},${p.mouth === "smirk" && x > 256 ? 194 : 200} Q${x},${p.mouth === "flat" ? 196 : 188} ${x + 24},200" stroke="${p.adult ? "#7a7470" : p.hair}" stroke-width="7" fill="none" stroke-linecap="round"/>`);
  }
  out.push(`<path d="M256,240 Q248,272 256,280 Q262,282 268,276" stroke="#000" stroke-opacity="0.28" stroke-width="4" fill="none" stroke-linecap="round"/>`);
  out.push(`<ellipse cx="200" cy="276" rx="20" ry="11" fill="#e0706a" opacity="0.22"/><ellipse cx="312" cy="276" rx="20" ry="11" fill="#e0706a" opacity="0.22"/>`);
  if (p.freckles) for (let i = 0; i < 14; i++) out.push(`<circle cx="${f((i % 2 ? 300 : 212) + (r() - 0.5) * 40)}" cy="${f(258 + r() * 22)}" r="2.2" fill="#8a4a2a" opacity="0.6"/>`);
  if (p.wrinkles) out.push(`<path d="M186,236 l-12,6 M186,226 l-12,-4 M326,236 l12,6 M326,226 l12,-4 M230,290 q-10,10 -6,22 M282,290 q10,10 6,22" stroke="#8a5a3a" stroke-width="2.5" fill="none" opacity="0.6"/>`);
  out.push(mouthPath(p.mouth));
  out.push(hairFront(p));
  if (p.leaf) out.push(`<path d="M318,128 q30,-24 52,4 q-30,20 -52,-4 Z" fill="#5f9145" stroke="#2f5a20" stroke-width="3"/>`);
  if (p.screw) out.push(`<rect x="360" y="196" width="10" height="40" rx="3" fill="#b8b8b8" stroke="#555" stroke-width="2" transform="rotate(20 365 216)"/>`);
  if (p.glasses === "round") out.push(`<g fill="none" stroke="#3a2a1a" stroke-width="5"><circle cx="218" cy="230" r="30"/><circle cx="294" cy="230" r="30"/><path d="M248,228 Q256,220 264,228 M188,226 L164,220 M324,226 L348,220"/></g>`);
  if (p.glasses === "rect") out.push(`<g fill="none" stroke="#2a2a3a" stroke-width="4"><rect x="192" y="214" width="52" height="32" rx="8"/><rect x="268" y="214" width="52" height="32" rx="8"/><path d="M244,228 L268,228 M192,226 L166,220 M320,226 L346,220"/></g>`);
  return out.join("");
}

function portraitSVG(key, size = 512) {
  const [a, b] = PEOPLE[key].bg;
  const r = rng(key.charCodeAt(1) * 31);
  const bokeh = Array.from({ length: 9 }, () => `<circle cx="${f(r() * 512)}" cy="${f(r() * 300)}" r="${f(20 + r() * 40)}" fill="${pick(r, ["#ffcf7a", "#ff9a3c", "#bcdcff"])}" opacity="${f(0.12 + r() * 0.2)}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    <defs><radialGradient id="bg" cx="0.5" cy="0.35" r="0.8"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></radialGradient>
    <radialGradient id="shade" cx="0.35" cy="0.3" r="0.9"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.22"/></radialGradient></defs>
    <rect width="512" height="512" fill="url(#bg)"/>${bokeh}${personSVG(key)}</svg>`;
}

function stagSVG(size = 512) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${DEFS}
    <defs><radialGradient id="bgS" cx="0.5" cy="0.4" r="0.8"><stop offset="0" stop-color="#6a8a5a"/><stop offset="1" stop-color="#22301c"/></radialGradient></defs>
    <rect width="512" height="512" fill="url(#bgS)"/>
    <g stroke="#3a2412" stroke-width="10" fill="none" stroke-linecap="round">
      <path d="M200,170 Q150,110 160,50 M170,120 Q120,110 100,80 M162,82 Q130,60 136,30"/>
      <path d="M312,170 Q362,110 352,50 M342,120 Q392,110 412,80 M350,82 Q382,60 376,30"/>
    </g>
    <g stroke="#a8784a" stroke-width="4" fill="none" stroke-linecap="round">
      <path d="M200,170 Q150,110 160,50 M170,120 Q120,110 100,80 M162,82 Q130,60 136,30"/>
      <path d="M312,170 Q362,110 352,50 M342,120 Q392,110 412,80 M350,82 Q382,60 376,30"/>
    </g>
    <path d="M86,512 Q120,400 200,380 L312,380 Q392,400 426,512 Z" fill="url(#wood)" stroke="#3a2412" stroke-width="6"/>
    <path d="M176,190 Q256,140 336,190 L320,330 Q256,420 192,330 Z" fill="url(#wood)" stroke="#3a2412" stroke-width="8"/>
    <path d="M150,200 L184,236 L176,186 Z M362,200 L328,236 L336,186 Z" fill="#7a5230" stroke="#3a2412" stroke-width="6"/>
    ${[0, 1, 2, 3, 4].map(i => `<path d="M${200 + i * 28},200 q-6,60 4,120" stroke="#5a3a1e" stroke-width="3" fill="none" opacity="0.6"/>`).join("")}
    <circle cx="222" cy="250" r="22" fill="url(#copper)" stroke="#3a1f0c" stroke-width="5"/><circle cx="290" cy="250" r="22" fill="url(#copper)" stroke="#3a1f0c" stroke-width="5"/>
    <circle cx="222" cy="250" r="7" fill="#ffd27a"/><circle cx="290" cy="250" r="7" fill="#ffd27a"/>
    <ellipse cx="256" cy="340" rx="34" ry="22" fill="#3a2412"/>
    ${[[176, 196], [336, 196], [210, 380], [302, 380]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#d8c8a0" stroke="#3a2412" stroke-width="3"/>`).join("")}
  </svg>`;
}

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

function brideSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${DEFS}
    <rect width="256" height="256" rx="24" fill="#2a2018"/>
    <g filter="url(#shadow)"><path d="M60,70 L196,70 L196,110 L176,110 L176,92 L80,92 L80,110 L60,110 Z" fill="url(#copper)" stroke="#3a1f0c" stroke-width="5"/>
    <path d="M60,186 L196,186 L196,146 L176,146 L176,164 L80,164 L80,146 L60,146 Z" fill="url(#copper)" stroke="#3a1f0c" stroke-width="5"/>
    ${[100, 128, 156].map(x => `<path d="M${x},92 l-8,22 l16,0 Z M${x},164 l-8,-22 l16,0 Z" fill="#e8c06a" stroke="#3a1f0c" stroke-width="3"/>`).join("")}
    <rect x="118" y="40" width="20" height="40" fill="#8a8a8a" stroke="#333" stroke-width="3"/></g></svg>`;
}

function coolerSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${DEFS}
    <rect width="256" height="256" rx="24" fill="#16222a"/>
    <circle cx="128" cy="128" r="110" fill="url(#glowB)" opacity="0.7"/>
    <g filter="url(#shadow)"><rect x="84" y="50" width="88" height="160" rx="30" fill="url(#glass)" stroke="#a8d8f0" stroke-width="4"/>
    ${[56, 120, 186].map(y => `<rect x="76" y="${y}" width="104" height="18" rx="6" fill="url(#copper)" stroke="#3a1f0c" stroke-width="3"/>`).join("")}</g>
    ${snowflake(128, 150, 22, "#ffffff")}${steam(128, 40, 26, 3, 3)}</svg>`;
}

function parchment(W, H, seed) {
  const r = rng(seed);
  const spots = Array.from({ length: 30 }, () => `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(10 + r() * 50)}" fill="#a07840" opacity="${f(0.03 + r() * 0.05)}"/>`).join("");
  return `<defs><radialGradient id="par" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#f1e1bf"/><stop offset="1" stop-color="#cfae78"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#par)"/>${spots}`;
}

function a02SVG() {
  const W = 1200, H = 760;
  const box = (x, n, title, sub, sym) => `<g><rect x="${x}" y="200" width="320" height="380" rx="18" fill="#fff7e6" stroke="#5a4630" stroke-width="5"/>
    <text x="${x + 160}" y="260" font-family="${SERIF}" font-size="44" font-weight="bold" text-anchor="middle" fill="#3a2614">${n} — ${title}</text>${sym}
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
    <rect width="${W}" height="${H}" fill="#f6efdc"/>${lines}<line x1="110" y1="0" x2="110" y2="${H}" stroke="#d88a8a" stroke-width="2"/>
    <ellipse cx="690" cy="470" rx="170" ry="120" fill="#a0703a" opacity="${f(0.16 + r() * 0.04)}"/>
    <g stroke="#3a3a46" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M200,180 L200,300 L300,300 L300,250 L260,250 L260,180"/><path d="M640,180 L640,300 L540,300 L540,250 L580,250 L580,180"/>
      <circle cx="420" cy="420" r="58"/><path d="M420,362 L420,420 L470,420"/>
      <path d="M520,520 Q470,500 448,454 M448,454 l4,26 M448,454 l22,10"/>
      <path d="M300,276 L380,276 M540,276 L460,276"/>
    </g>
    <text x="250" y="150" font-family="${SERIF}" font-style="italic" font-size="34" fill="#3a3a46" text-anchor="middle">encoche</text>
    <text x="590" y="150" font-family="${SERIF}" font-style="italic" font-size="34" fill="#3a3a46" text-anchor="middle">encoche</text>
    <text x="560" y="560" font-family="${SERIF}" font-style="italic" font-size="34" fill="#3a3a46">loquet : fermer vers l’intérieur</text></svg>`;
}

function coverSVG(W = 1600, H = 900) {
  const r = rng(77);
  const stars = Array.from({ length: 140 }, () => `<circle cx="${f(r() * W)}" cy="${f(r() * H * 0.6)}" r="${f(0.8 + r() * 2)}" fill="#fff" opacity="${f(0.3 + r() * 0.6)}"/>`).join("");
  const lanterns = Array.from({ length: 34 }, () => {
    const x = r() * W, y = 120 + r() * (H - 300), c = r() < 0.35 ? "B" : "O", s = 0.5 + r() * 0.9;
    return `<g transform="translate(${f(x)},${f(y)}) scale(${f(s)})">${lantern(0, 0, c, 80)}</g>`;
  }).join("");
  const castle = `<path d="M0,${H - 260} L120,${H - 260} L120,${H - 330} L150,${H - 330} L150,${H - 380} L170,${H - 420} L190,${H - 380} L190,${H - 330} L260,${H - 330} L260,${H - 290} L380,${H - 290} L380,${H - 360} L400,${H - 400} L420,${H - 360} L420,${H - 290} L560,${H - 290} L560,${H - 250} L${W},${H - 250} L${W},${H} L0,${H} Z" fill="#0b0d1c"/>`;
  const greenhouse = Array.from({ length: 6 }, (_, i) => {
    const x = 980 + i * 110;
    return `<path d="M${x},${H} L${x},${H - 150} Q${x + 55},${H - 230} ${x + 110},${H - 150} L${x + 110},${H}" fill="#14251f" stroke="#2c4a3e" stroke-width="4"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${DEFS}
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0f2a"/><stop offset="0.6" stop-color="#2b1d4a"/><stop offset="1" stop-color="#6a3a2a"/></linearGradient>
    <filter id="glowT"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>${stars}<circle cx="1360" cy="150" r="70" fill="#f6e7c0" opacity="0.9"/>
    ${castle}${greenhouse}${lanterns}
    <g transform="translate(800,420)">${phoenixTop(0, 0, 520, { lit: true, flutter: 1 })}</g>
    <rect x="0" y="${H - 210}" width="${W}" height="210" fill="#000" opacity="0.35"/>
    <text x="${W / 2}" y="${H - 105}" font-family="${SERIF}" font-size="92" font-weight="bold" text-anchor="middle" fill="#ffe2a8" filter="url(#glowT)">La Nuit des lanternes indociles</text>
    <text x="${W / 2}" y="${H - 45}" font-family="${SERIF}" font-size="38" font-style="italic" text-anchor="middle" fill="#f3d6a0">One shot Harry Potter JdR · Halloween 1988</text></svg>`;
}

/* -------------------------------------------- */
/*  Génération                                  */
/* -------------------------------------------- */

const jobs = [];
for (const [code, map] of Object.entries(MAPS)) {
  for (const state of map.states) jobs.push(write(MAP_DRAW[code](state), `maps/${map.file}-${state}.webp`, { quality: 82 }));
  jobs.push(write(MAP_DRAW[code](map.states[0]), `maps/thumbs/${map.file}.webp`, { width: 300, height: Math.round(300 * map.h / map.w), quality: 75 }));
}
const RINGS = { gryffindor: ["#7f0909", "#e8b20e"], slytherin: ["#1a472a", "#c0c0c0"], ravenclaw: ["#0e1a40", "#a8783a"], hufflepuff: ["#e1a92e", "#2b2420"] };
for (const key of Object.keys(PEOPLE)) {
  const svg = portraitSVG(key);
  jobs.push(write(svg, `portraits/${key}.webp`));
  const data = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const ring = PEOPLE[key].house ? RINGS[PEOPLE[key].house] : ["#5b2a7a", "#e8c06a"];
  jobs.push(write(tokenSVG(data, ring), `tokens/${key}.webp`));
}
const stag = stagSVG();
jobs.push(write(stag, "portraits/cerf.webp"));
jobs.push(write(tokenSVG(`data:image/svg+xml;base64,${Buffer.from(stag).toString("base64")}`, ["#6b4424", "#d8c8a0"]), "tokens/cerf.webp"));
jobs.push(write(brideSVG(), "items/bride.webp"), write(coolerSVG(), "items/refroidisseur.webp"));
jobs.push(write(a02SVG(), "handouts/a02-schema.webp"), write(a03SVG(), "handouts/a03-croquis.webp"));
const cover = coverSVG();
jobs.push(write(cover, "art/cover.webp"), write(cover, "art/cover-thumb.webp", { width: 400, height: 225, quality: 78 }));
const files = await Promise.all(jobs);
console.log(`${files.length} images générées dans assets/.`);
