#!/usr/bin/env node
/* GORRIóN · Revisión de velocidad con Lighthouse
 *
 * Mide, como en un móvil de gama media con conexión 4G, estas páginas de la web publicada:
 *   portada · portada en inglés · Proyectos · un proyecto · una noticia   (y la portada en ordenador)
 * Cada medición se repite LH_RUNS veces (3 por defecto) y se toma la mediana, porque en servidores compartidos el resultado varía.
 * Umbrales (por debajo = «por mejorar»): Rendimiento 70 · Accesibilidad 90 · Buenas prácticas 90 · SEO 90.
 *
 * Uso:  node tools/lighthouse-run.mjs [https://dirección-de-la-web]
 * Necesita el comando `lighthouse` (npm i -g lighthouse) y Chrome. Escribe reports/lighthouse.json, reports/lighthouse.md
 * y los informes completos en reports/lighthouse/*.html. */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const arg = process.argv[2] && process.argv[2].trim();
let base = arg || process.env.SITE_URL || "";
if (!base) { try { base = JSON.parse(readFileSync("content/site.json", "utf8")).siteUrl || ""; } catch (e) { /* nada */ } }
base = base.replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) { console.error("Falta la dirección de la web."); process.exit(2); }
const ORIGIN = new URL(base).origin, RUNS = Math.max(1, Number(process.env.LH_RUNS) || 3), BIN = process.env.LIGHTHOUSE_BIN || "lighthouse";
const MIN = { performance: 70, accessibility: 90, "best-practices": 90, seo: 90 };
const NAMES = { performance: "Rendimiento", accessibility: "Accesibilidad", "best-practices": "Buenas prácticas", seo: "SEO" };

/* Páginas: se eligen del sitemap para que siempre existan */
const sm = await fetch(base + "/sitemap.xml").then((r) => (r.ok ? r.text() : "")).catch(() => "");
const paths = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1].trim()).pathname);
const first = (re) => paths.find((p) => re.test(p));
const targets = [["Portada", "/", "mobile"], ["Portada (inglés)", "/en/", "mobile"], ["Proyectos", "/proyectos/", "mobile"], ["Un proyecto", first(/^\/proyectos\/[^/]+\/$/), "mobile"], ["Una noticia", first(/^\/noticias\/[^/]+\/$/), "mobile"], ["Portada en ordenador", "/", "desktop"]].filter((t) => t[1]);

mkdirSync("reports/lighthouse", { recursive: true });
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const results = [];
for (const [label, path, form] of targets) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const out = `reports/lighthouse/tmp-${results.length}-${i}.json`;
    const args = [ORIGIN + path, "--output=json", `--output-path=${out}`, "--quiet", "--only-categories=performance,accessibility,best-practices,seo", "--chrome-flags=--headless=new --no-sandbox --disable-gpu"];
    if (form === "desktop") args.push("--preset=desktop");
    const r = spawnSync(BIN, args, { encoding: "utf8", timeout: 240000 });
    if (r.status !== 0 || !existsSync(out)) { console.error(`⚠ Lighthouse falló en ${path} (${form}): ${(r.stderr || r.error || "").toString().slice(0, 300)}`); continue; }
    const j = JSON.parse(readFileSync(out, "utf8"));
    runs.push({ j, perf: j.categories.performance.score });
  }
  if (!runs.length) { results.push({ label, path, form, error: true }); continue; }
  runs.sort((a, b) => a.perf - b.perf);
  const m = runs[Math.floor(runs.length / 2)].j;
  const sc = Object.fromEntries(Object.keys(MIN).map((k) => [k, Math.round(((m.categories[k] || {}).score || 0) * 100)]));
  const au = (id) => (m.audits[id] || {}).displayValue || "–";
  const metrics = { FCP: au("first-contentful-paint"), LCP: au("largest-contentful-paint"), TBT: au("total-blocking-time"), CLS: au("cumulative-layout-shift"), SI: au("speed-index") };
  /* Lo que más ayudaría a mejorar (oportunidades con ahorro estimado) */
  const tips = Object.values(m.audits).filter((a) => a.details && a.details.type === "opportunity" && a.details.overallSavingsMs > 300).sort((a, b) => b.details.overallSavingsMs - a.details.overallSavingsMs).slice(0, 3).map((a) => `${a.title} (−${(a.details.overallSavingsMs / 1000).toFixed(1)} s)`);
  const slug = (path === "/" ? "inicio" : path.replace(/^\/|\/$/g, "").replace(/\//g, "-")) + "-" + form;
  writeFileSync(`reports/lighthouse/${slug}.json`, JSON.stringify({ scores: sc, metrics }, null, 2));
  results.push({ label, path, form, scores: sc, metrics, tips, low: Object.keys(MIN).filter((k) => sc[k] < MIN[k]) });
}

/* Informe */
const dot = (v, k) => (v >= MIN[k] ? "🟢" : v >= MIN[k] - 15 ? "🟠" : "🔴");
const lines = ["## ⚡ Velocidad y calidad (Lighthouse)", "", `Mediana de ${RUNS} mediciones por página, móvil con conexión 4G simulada (la portada, también en ordenador). Mínimos: ${Object.entries(MIN).map(([k, v]) => `${NAMES[k]} ${v}`).join(" · ")}.`, ""];
lines.push("| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | TBT | CLS |", "|---|---:|---:|---:|---:|---:|---:|---:|");
for (const r of results) lines.push(r.error ? `| ${r.label} (${r.form === "desktop" ? "ordenador" : "móvil"}) | no se pudo medir | | | | | | |` : `| ${r.label}${r.form === "desktop" ? "" : " · móvil"} | ${dot(r.scores.performance, "performance")} ${r.scores.performance} | ${dot(r.scores.accessibility, "accessibility")} ${r.scores.accessibility} | ${dot(r["scores"]["best-practices"], "best-practices")} ${r.scores["best-practices"]} | ${dot(r.scores.seo, "seo")} ${r.scores.seo} | ${r.metrics.LCP} | ${r.metrics.TBT} | ${r.metrics.CLS} |`);
const low = results.filter((r) => !r.error && r.low.length), failed = results.filter((r) => r.error);
if (low.length) { lines.push("", "### Por mejorar"); low.forEach((r) => lines.push(`- **${r.label}** (${r.path}): ${r.low.map((k) => `${NAMES[k]} ${r.scores[k]}`).join(", ")}${r.tips.length ? ` · Lo que más ayudaría: ${r.tips.join("; ")}` : ""}`)); }
else if (!failed.length) lines.push("", "✅ Todas las páginas cumplen los mínimos.");
if (failed.length) lines.push("", `⚠ No se pudo medir: ${failed.map((r) => r.path).join(", ")}.`);
const md = lines.join("\n");
writeFileSync("reports/lighthouse.json", JSON.stringify({ base, fecha: new Date().toISOString(), runs: RUNS, minimos: MIN, resultados: results, problemas: low.length + failed.length }, null, 2));
writeFileSync("reports/lighthouse.md", md + "\n");
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
console.log(md);
