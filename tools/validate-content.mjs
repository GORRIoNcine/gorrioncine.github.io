// Valida content/*.json antes (o después) de publicar. Uso: node tools/validate-content.mjs [carpeta-del-sitio]
// Sin dependencias. Sale con código 1 si hay errores (referencias rotas, ids repetidos, JSON mal formado…).
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] || ".";
const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);

const TYPES = ["ficcion", "documental", "serie", "videoclip", "encargo"];
const STATUS = ["estrenado", "produccion", "desarrollo"];
const ROLES = ["direccion", "guion", "produccion", "produccionEj", "fotografia", "montaje", "sonido", "musica", "arte", "reparto", "cliente"];
const CATS = ["estrenos", "rodajes", "convocatorias", "detras"];

function load(name) {
  const f = join(root, "content", name + ".json");
  if (!existsSync(f)) { err(`Falta el archivo content/${name}.json`); return null; }
  try { return JSON.parse(readFileSync(f, "utf8")); } catch (e) { err(`content/${name}.json no es un JSON válido: ${e.message}`); return null; }
}
const list = (v) => (Array.isArray(v) ? v : []);
const txt = (o) => (o && typeof o === "object" ? o.es || o.en || "" : o || "");
const imgs = [];
const img = (where, v) => { if (typeof v === "string" && v.startsWith("/uploads/")) imgs.push([where, v]); };

const proy = load("proyectos"), noti = load("noticias"), pre = load("prensa"), equ = load("equipo");
load("site"); load("servicios"); load("nosotros");

const ids = new Map(), slugs = new Map();
list(proy && proy.items).forEach((p, i) => {
  const n = `Proyecto ${i + 1} «${p.title || "sin título"}»`;
  if (!p.title) err(`${n}: falta el título.`);
  if (!p.id) err(`${n}: no tiene identificador interno (id). Añade uno, por ejemplo proj-${(p.slug || "nuevo")}.`);
  else if (!/^proj-[a-z0-9-]+$/.test(p.id)) err(`${n}: el id «${p.id}» solo puede llevar minúsculas, números y guiones, y empezar por «proj-».`);
  else if (ids.has(p.id)) err(`${n}: el id «${p.id}» ya lo usa «${ids.get(p.id)}».`); else ids.set(p.id, p.title);
  if (!p.slug) err(`${n}: falta la dirección web (slug).`);
  else if (!/^[a-z0-9-]+$/.test(p.slug)) err(`${n}: el slug «${p.slug}» solo puede llevar minúsculas, números y guiones.`);
  else if (slugs.has(p.slug)) err(`${n}: el slug «${p.slug}» ya lo usa «${slugs.get(p.slug)}».`); else slugs.set(p.slug, p.title);
  if (p.type && !TYPES.includes(p.type)) err(`${n}: tipo desconocido «${p.type}».`);
  if (p.status && !STATUS.includes(p.status)) err(`${n}: estado desconocido «${p.status}».`);
  list(p.crew).forEach((c) => { if (c && !ROLES.includes(c.r)) warn(`${n}: cargo desconocido «${c.r}» en la ficha técnica (se omitirá).`); });
  list(p.journey).forEach((j) => { if (j && j.d && !/^\d{4}-\d{2}$/.test(j.d)) warn(`${n}: la fecha «${j.d}» del recorrido debería tener formato AAAA-MM.`); });
  img(n, p.poster); list(p.stills).forEach((s) => img(n, typeof s === "string" ? s : s && s.image));
});
const items = list(proy && proy.items);
if (proy && !items.length) warn("No hay ningún proyecto: el inicio no mostrará proyecto destacado.");
if (items.filter((p) => p.featured).length > 1) warn("Hay más de un proyecto destacado; la web usará el primero.");
if (items.length && !items.some((p) => p.featured)) warn("Ningún proyecto está destacado; la web usará el primero de la lista.");

const nslugs = new Set();
list(noti && noti.items).forEach((n, i) => {
  const t = `Noticia ${i + 1} «${txt(n.title) || "sin título"}»`;
  if (!txt(n.title)) err(`${t}: falta el título.`);
  if (!n.slug) err(`${t}: falta la dirección web (slug).`); else if (nslugs.has(n.slug)) err(`${t}: el slug «${n.slug}» está repetido.`); else nslugs.add(n.slug);
  if (n.cat && !CATS.includes(n.cat)) err(`${t}: categoría desconocida «${n.cat}».`);
  if (n.date && !/^\d{4}-\d{2}-\d{2}/.test(String(n.date))) warn(`${t}: la fecha «${n.date}» debería tener formato AAAA-MM-DD.`);
  if (n.project && !ids.has(n.project)) err(`${t}: apunta a un proyecto que no existe (${n.project}). Elige otro proyecto o déjalo vacío.`);
  img(t, n.image);
});
list(pre && pre.awards).forEach((a, i) => {
  const t = `Premio ${i + 1} «${txt(a.a)}» (${a.f || "sin festival"}, ${a.y || "s/f"})`;
  if (a.p && !ids.has(a.p)) err(`${t}: apunta a un proyecto que no existe (${a.p}). Elige otro proyecto o déjalo vacío.`);
});
list(equ && equ.items).forEach((m) => img(`Equipo «${m.n}»`, m.photo));
imgs.forEach(([w, f]) => { if (!existsSync(join(root, f.slice(1)))) warn(`${w}: la imagen ${f} no está en la carpeta uploads.`); });

const out = [];
if (errors.length) out.push(`❌ ${errors.length} error(es) que rompen enlaces o datos:`, ...errors.map((m) => "  - " + m));
if (warnings.length) out.push(`⚠️ ${warnings.length} aviso(s):`, ...warnings.map((m) => "  - " + m));
if (!errors.length && !warnings.length) out.push("✅ Contenido correcto.");
console.log(out.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) { try { (await import("node:fs")).appendFileSync(process.env.GITHUB_STEP_SUMMARY, "## Validación del contenido\n\n" + out.join("\n") + "\n"); } catch (e) { /* nada */ } }
process.exit(errors.length ? 1 : 0);
