#!/usr/bin/env node
/* GORRIóN · Revisión de enlaces rotos
 *
 * Recorre la web publicada (todas las páginas de sitemap.xml) y comprueba:
 *   · los enlaces, imágenes, estilos y scripts que aparecen en cada página;
 *   · todos los enlaces y rutas de imagen escritos en content/*.json (tráilers, «dónde verla», redes, prensa, carteles…),
 *     que son los que la aplicación pinta con JavaScript y no se ven en el HTML.
 * Interno roto = error. Externo que devuelve 404/410 o no existe = roto. Externo que bloquea a los robots (403, 429, 999…)
 * o tarda demasiado = «no verificable» (se lista aparte y no cuenta como problema).
 *
 * Uso:  node tools/check-links.mjs [https://dirección-de-la-web]     (por defecto, siteUrl de content/site.json)
 * Escribe reports/links.json y reports/links.md (y el resumen en GITHUB_STEP_SUMMARY si existe). */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";

const arg = process.argv[2] && process.argv[2].trim();
let base = arg || process.env.SITE_URL || "";
if (!base) { try { base = JSON.parse(readFileSync("content/site.json", "utf8")).siteUrl || ""; } catch (e) { /* nada */ } }
base = base.replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) { console.error("Falta la dirección de la web (argumento, SITE_URL o content/site.json → siteUrl)."); process.exit(2); }
const ORIGIN = new URL(base).origin;
const UA = "Mozilla/5.0 (compatible; GORRIoN-revision-semanal/1.0; +" + base + ")";
const SOFT = /(^|\.)(instagram|facebook|fb|x|twitter|linkedin|tiktok|threads)\.com$|(^|\.)(t\.me|wa\.me|whatsapp\.com|vimeo\.com|youtu\.be|youtube\.com)$/i;

async function req(url, method = "HEAD", ms = 20000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { method, redirect: "follow", signal: ctl.signal, headers: { "user-agent": UA, accept: "*/*" } }); }
  finally { clearTimeout(t); }
}
const cache = new Map();
/* → { ok, status, kind } kind: ok | roto | noverificable */
async function check(url) {
  if (cache.has(url)) return cache.get(url);
  const p = (async () => {
    const u = new URL(url), internal = u.origin === ORIGIN, soft = SOFT.test(u.hostname);
    let status = 0, err = "";
    for (const [m, tries] of [["HEAD", 1], ["GET", 2]]) {
      for (let i = 0; i < tries; i++) {
        try { const r = await req(url, m); status = r.status; err = ""; if (m === "GET" && r.body) r.body.cancel().catch(() => {}); if (status < 400) return { ok: true, status, kind: "ok" }; break; }
        catch (e) { err = (e && e.cause && e.cause.code) || (e && e.name) || "error"; status = 0; }
      }
    }
    if (status === 404 || status === 410 || (status === 0 && /ENOTFOUND|EAI_AGAIN/.test(err))) return { ok: false, status, err, kind: soft && status !== 404 ? "noverificable" : "roto" };
    if (internal) return { ok: false, status, err, kind: "roto" };
    return { ok: false, status, err, kind: "noverificable" };
  })();
  cache.set(url, p); return p;
}
async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; }
let SITE_ORIGIN = ORIGIN; try { SITE_ORIGIN = new URL(JSON.parse(readFileSync("content/site.json", "utf8")).siteUrl).origin; } catch (e) { /* nada */ }
/* Si se prueba otra dirección (p. ej. un servidor local), los enlaces absolutos a la dirección oficial cuentan como internos */
const abs = (href, from) => { try { const u = new URL(href.replace(/&amp;/g, "&"), from); if (!/^https?:$/.test(u.protocol)) return null; if (u.origin === SITE_ORIGIN) { const o = new URL(ORIGIN); u.protocol = o.protocol; u.host = o.host; } u.hash = ""; return u.href; } catch (e) { return null; } };

/* 1) páginas del sitemap */
const sm = await req(base + "/sitemap.xml", "GET").then((r) => (r.ok ? r.text() : "")).catch(() => "");
let pages = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1].trim()).pathname);
pages = [...new Set(["/", ...pages])].map((p) => ORIGIN + p);
if (!sm) console.warn("⚠ No se pudo leer sitemap.xml; solo se revisa la portada y el contenido.");

/* 2) enlaces de cada página (HTML) */
const found = new Map(); // url → Set(origen)
const add = (url, from) => { if (!url) return; if (!found.has(url)) found.set(url, new Set()); found.get(url).add(from); };
const pageProblems = [];
await pool(pages, 6, async (pg) => {
  try {
    const r = await req(pg, "GET"); if (!r.ok) { pageProblems.push({ url: pg, status: r.status }); return; }
    const html = await r.text();
    for (const m of html.matchAll(/<(?:a|link)\b[^>]*?\bhref=["']([^"']+)["']/gi)) add(abs(m[1], pg), pg);
    for (const m of html.matchAll(/<(?:img|script|source|iframe)\b[^>]*?\bsrc=["']([^"']+)["']/gi)) add(abs(m[1], pg), pg);
  } catch (e) { pageProblems.push({ url: pg, status: 0, err: (e && e.name) || "error" }); }
});

/* 3) enlaces del contenido (lo que pinta JavaScript) */
const CONTENT = ["site", "proyectos", "noticias", "equipo", "servicios", "nosotros", "prensa"];
const walk = (v, from) => { if (typeof v === "string") { const s = v.trim(); if (/^https?:\/\/\S+$/.test(s) || /^\/?uploads\/\S+$/.test(s)) add(abs(s.startsWith("uploads") ? "/" + s : s, base + "/"), from); } else if (Array.isArray(v)) v.forEach((x) => walk(x, from)); else if (v && typeof v === "object") Object.values(v).forEach((x) => walk(x, from)); };
for (const n of CONTENT) { try { const r = await req(`${base}/content/${n}.json`, "GET"); if (r.ok) walk(await r.json(), `content/${n}.json`); } catch (e) { /* nada */ } }

/* 4) comprobación */
const urls = [...found.keys()].filter((u) => !/\/cdn-cgi\/|fonts\.(googleapis|gstatic)\.com|static\.cloudflareinsights\.com/.test(u));
const res = await pool(urls, 10, async (u) => ({ url: u, from: [...found.get(u)], ...(await check(u)) }));
const bad = res.filter((x) => x.kind === "roto"), soft = res.filter((x) => x.kind === "noverificable");
const internal = (x) => new URL(x.url).origin === ORIGIN;
const rep = { base, fecha: new Date().toISOString(), paginas: pages.length, enlaces: urls.length, paginasConError: pageProblems, rotosInternos: bad.filter(internal), rotosExternos: bad.filter((x) => !internal(x)), noVerificables: soft };
rep.problemas = rep.paginasConError.length + rep.rotosInternos.length + rep.rotosExternos.length;

const short = (u) => u.replace(ORIGIN, "") || "/";
const code = (x) => (x.status ? String(x.status) : x.err || "sin respuesta");
const lines = [`## 🔗 Enlaces`, "", `Se revisaron **${pages.length} páginas** y **${urls.length} enlaces o archivos** de ${base}.`, ""];
if (!rep.problemas) lines.push("✅ No hay enlaces rotos.");
if (rep.paginasConError.length) lines.push("### Páginas que no cargan", ...rep.paginasConError.map((p) => `- ${short(p.url)} → ${p.status || p.err}`), "");
if (rep.rotosInternos.length) lines.push("### Enlaces internos rotos", ...rep.rotosInternos.map((x) => `- \`${short(x.url)}\` (${code(x)}) · aparece en: ${x.from.slice(0, 3).map(short).join(", ")}${x.from.length > 3 ? ` y ${x.from.length - 3} más` : ""}`), "");
if (rep.rotosExternos.length) lines.push("### Enlaces externos rotos", ...rep.rotosExternos.map((x) => `- ${x.url} (${code(x)}) · aparece en: ${x.from.slice(0, 3).map(short).join(", ")}${x.from.length > 3 ? ` y ${x.from.length - 3} más` : ""}`), "");
if (soft.length) lines.push(`<details><summary>${soft.length} enlace(s) externos no verificables (la otra web bloquea a los robots o tardó demasiado; no cuentan como problema)</summary>`, "", ...soft.map((x) => `- ${x.url} (${code(x)})`), "", "</details>", "");
const md = lines.join("\n");
mkdirSync("reports", { recursive: true });
writeFileSync("reports/links.json", JSON.stringify(rep, null, 2));
writeFileSync("reports/links.md", md + "\n");
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
console.log(md);
console.log(`\nProblemas: ${rep.problemas}`);
