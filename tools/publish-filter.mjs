#!/usr/bin/env node
/* Prepara la publicación: quita de content/*.json (solo en la copia que se publica, nunca en el repositorio)
   los borradores y lo programado para más adelante, para que no se puedan leer desde la web.
   Uso: node tools/publish-filter.mjs [carpeta] */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { visibleContent, nowHavana } from "./visibility.mjs";

const ROOT = process.argv[2] || ".";
const rd = (n) => { try { return JSON.parse(readFileSync(join(ROOT, "content", n + ".json"), "utf8")); } catch (e) { return null; } };
const src = { proyectos: rd("proyectos"), noticias: rd("noticias"), prensa: rd("prensa") };
const now = nowHavana(), out = visibleContent(src, now);
let hidden = 0;
for (const [name, data] of Object.entries(out)) {
  if (!src[name]) continue;
  const before = JSON.stringify(src[name]), after = JSON.stringify(data);
  if (before !== after) { writeFileSync(join(ROOT, "content", name + ".json"), JSON.stringify(data, null, 2) + "\n"); hidden++; }
}
console.log(hidden ? `✔ Borradores y publicaciones programadas retirados de la copia publicada (${hidden} archivo(s)). Hora en Cuba: ${now.replace("T", " ")}` : "✔ No hay borradores ni publicaciones pendientes.");
