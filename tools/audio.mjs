// Ambiances originales synthétisées (aucun échantillon externe) : bruit filtré, cliquetis,
// gouttes et bourdonnements, bouclés sans couture puis encodés en Ogg Vorbis par ffmpeg.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "assets", "audio");
const RATE = 44100;
const SECONDS = 40;
const N = RATE * SECONDS;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bruit filtré passe-bas (un pôle), amplitude réglable. */
function noise(buf, r, gain, alpha) {
  let y = 0;
  for (let i = 0; i < N; i++) {
    y += alpha * ((r() * 2 - 1) - y);
    buf[i] += y * gain;
  }
}

/** Événement bref (clic, goutte, tintement) : sinus amorti. */
function blip(buf, at, freq, gain, decay, glide = 0) {
  const len = Math.floor(RATE * decay * 6);
  let phase = 0;
  for (let k = 0; k < len; k++) {
    const i = (at + k) % N;
    const t = k / RATE;
    phase += (2 * Math.PI * (freq + glide * t)) / RATE;
    buf[i] += Math.sin(phase) * gain * Math.exp(-t / decay);
  }
}

function drone(buf, freq, gain, wobble = 0.1) {
  for (let i = 0; i < N; i++) {
    const t = i / RATE;
    // Fréquences entières sur la durée de boucle pour que la fin rejoigne le début.
    const lfo = 1 + wobble * Math.sin((2 * Math.PI * 2 * t) / SECONDS);
    buf[i] += gain * lfo * (Math.sin(2 * Math.PI * freq * t) + 0.4 * Math.sin(2 * Math.PI * freq * 2 * t));
  }
}

const SCENES = {
  cour(buf, r) {
    noise(buf, r, 0.18, 0.04);
    for (let i = 0; i < 70; i++) blip(buf, Math.floor(r() * N), [1318, 1568, 1760, 2093, 2637][Math.floor(r() * 5)], 0.05, 0.5);
  },
  atelier(buf, r) {
    noise(buf, r, 0.08, 0.06);
    const beat = Math.floor(RATE * 0.8);
    for (let at = 0; at < N; at += beat) {
      blip(buf, at, 180, 0.25, 0.03);
      blip(buf, at + Math.floor(beat / 2), 2400 + r() * 600, 0.08, 0.01);
    }
    for (let i = 0; i < 60; i++) blip(buf, Math.floor(r() * N), 3000 + r() * 2000, 0.05, 0.008);
  },
  serre(buf, r) {
    noise(buf, r, 0.12, 0.02);
    for (let i = 0; i < 90; i++) blip(buf, Math.floor(r() * N), 900 + r() * 700, 0.1, 0.04, -4000);
    for (let i = 0; i < 25; i++) blip(buf, Math.floor(r() * N), 2600 + r() * 800, 0.03, 0.4);
  },
  phenix(buf, r) {
    drone(buf, 55, 0.14, 0.25);
    drone(buf, 82.5, 0.06, 0.4);
    noise(buf, r, 0.1, 0.35);
    for (let i = 0; i < 12; i++) blip(buf, Math.floor(r() * N), 140, 0.2, 0.08);
  },
};

fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lanternes-audio-"));
let seed = 11;
for (const [name, fill] of Object.entries(SCENES)) {
  const buf = new Float32Array(N);
  fill(buf, rng(seed++));
  // Normalisation douce et fondu de 50 ms aux extrémités pour une boucle sans clic.
  const peak = buf.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const fade = Math.floor(RATE * 0.05);
  const pcm = Buffer.alloc(N * 2);
  for (let i = 0; i < N; i++) {
    const env = Math.min(1, i / fade, (N - 1 - i) / fade);
    pcm.writeInt16LE(Math.round((buf[i] / peak) * 0.6 * env * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  const wav = path.join(tmp, `${name}.wav`);
  fs.writeFileSync(wav, Buffer.concat([header, pcm]));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-c:a", "libvorbis", "-q:a", "3", path.join(OUT, `${name}.ogg`)]);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${Object.keys(SCENES).length} ambiances générées dans assets/audio/.`);
