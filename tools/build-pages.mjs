#!/usr/bin/env node
/* GORRIóN · Generador de páginas para buscadores y redes sociales
 *
 * Lee content/*.json y crea, junto a la web (que sigue siendo la misma aplicación):
 *   /index.html, /proyectos/, /proyectos/<nombre>/, /noticias/<nombre>/, /servicios/, /nosotros/, /prensa/, /contacto/, /legal/
 *   /404.html, /sitemap.xml, /robots.txt, /site.webmanifest
 * Cada página lleva su título, descripción, enlace canónico, tarjeta para redes (Open Graph / Twitter),
 * datos estructurados (JSON-LD) y un resumen del contenido legible sin JavaScript.
 * La aplicación, al cargar, sustituye ese resumen por la web completa.
 *
 * Uso:  node tools/build-pages.mjs            (desde la raíz del repositorio)
 *       node tools/build-pages.mjs ./ruta     (otra carpeta)
 * Sin dependencias: solo Node 18 o superior. La dirección del sitio sale de content/site.json → siteUrl.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import vm from "node:vm";

const ROOT = process.argv[2] || ".";
const MARK = "<!-- gorrion:generated -->";
const read = (f) => readFileSync(join(ROOT, f), "utf8");
const json = (f, d) => { try { return JSON.parse(read(f)); } catch (e) { if (d !== undefined) return d; throw new Error(`No se pudo leer ${f}: ${e.message}`); } };
const write = (f, txt) => { const p = join(ROOT, f); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, txt); };

/* ---------- Datos ---------- */
const site = json("content/site.json", {});
const projects = json("content/proyectos.json", { items: [] }).items || [];
const news = json("content/noticias.json", { items: [] }).items || [];
const team = json("content/equipo.json", { items: [] }).items || [];
const serv = json("content/servicios.json", {});
const about = json("content/nosotros.json", {});
const press = json("content/prensa.json", {});
const seo = json("content/seo.json", {});
// Acepta el código solo, «google-site-verification=…» o la etiqueta <meta …content="…"> completa: se queda con el código.
const cleanCode = (v) => { let t = String(v || "").trim(); const m = t.match(/content\s*=\s*["']([^"']+)["']/i); if (m) t = m[1]; return t.replace(/^google-site-verification\s*=\s*/i, "").replace(/^["']|["']$/g, "").trim(); };
seo.googleVerification = cleanCode(seo.googleVerification); seo.bingVerification = cleanCode(seo.bingVerification);
// Estadísticas de visitas (Cloudflare Web Analytics): acepta el código solo o el fragmento completo que da Cloudflare.
const ANALYTICS = (() => { const raw = String(site.analyticsToken || "").trim(); const m = raw.match(/["']?token["']?\s*:\s*["']([A-Za-z0-9]+)["']/); const t = (m ? m[1] : raw).trim(); return /^[A-Za-z0-9]{16,}$/.test(t) ? t : ""; })();
const INDEXAR = seo.indexar !== false; // false = «no aparecer en Google» (pausa global)

let SITE_URL = String(site.siteUrl || "https://gorrioncine.github.io").trim().replace(/\/+$/, "");
if (!/^https?:\/\/[^/\s]+$/.test(SITE_URL)) { console.warn(`⚠ siteUrl «${site.siteUrl}» no es válido; se usa https://gorrioncine.github.io`); SITE_URL = "https://gorrioncine.github.io"; }
const NAME = "GORRIóN";

/* ---------- Textos de la aplicación (misma fuente que la web) ---------- */
const appSrc = read("assets/app.js");
function extractConst(name) {
  const i = appSrc.indexOf(`const ${name} = {`);
  if (i < 0) return {};
  const j = appSrc.indexOf("\n};", i);
  try { return vm.runInNewContext("(" + appSrc.slice(i + `const ${name} = `.length, j + 2) + ")"); } catch (e) { return {}; }
}
const TYPES = extractConst("TYPES"), STATUS = extractConst("STATUS"), ROLES = extractConst("ROLES"), NEWS_CATS = extractConst("NEWS_CATS");
function ui(key, fallback = "") {
  const m = appSrc.match(new RegExp(`\\b${key}: \\["((?:[^"\\\\]|\\\\.)*)"`));
  if (!m) return fallback;
  try { return JSON.parse(`"${m[1]}"`); } catch (e) { return fallback; }
}
const stripTags = (s) => String(s).replace(/<[^>]*>/g, "");

/* ---------- Utilidades ---------- */
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const L = (o) => (o == null ? "" : typeof o === "string" ? o : Array.isArray(o) ? o : o.es || o.en || "");
const txt = (o) => { const v = L(o); return Array.isArray(v) ? v.join(" ") : String(v); };
const cut = (x, n = 200) => { x = String(x || "").replace(/\s+/g, " ").trim(); return x.length > n ? x.slice(0, n - 3).replace(/\s+\S*$/, "") + "…" : x; };
const abs = (u) => (!u ? "" : /^https?:/.test(u) ? u : SITE_URL + (u[0] === "/" ? u : "/" + u));
const jsonld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const slugOk = (s) => typeof s === "string" && /^[a-z0-9][a-z0-9-]*$/.test(s);
const projBy = (ref) => projects.find((p) => p.id === ref) || projects.find((p) => p.slug === ref);
const typeLabel = (t) => (TYPES[t] ? TYPES[t].es : t || "");
const fmtDate = (d) => { const m = String(d || "").match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/); if (!m) return String(d || ""); const mes = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][+m[2] - 1] || ""; return m[3] ? `${+m[3]} de ${mes} de ${m[1]}` : `${mes} de ${m[1]}`; };

const assetHash = createHash("sha1").update(appSrc).update(read("assets/app.css")).digest("hex").slice(0, 10);
const OG_DEFAULT = seo.ogImage ? abs(seo.ogImage) : `${SITE_URL}/assets/og-default.png`;

const NAV = [["proyectos", "Proyectos"], ["servicios", "Servicios"], ["nosotros", "Nosotros"], ["prensa", "Prensa"], ["noticias", "Noticias"], ["contacto", "Contacto"]];
const SECTION_DESC = {
  proyectos: ui("projects_lede", "Películas, documentales, series, videoclips y encargos."),
  servicios: ui("svc_lede", "Producción audiovisual para proyectos propios y ajenos."),
  nosotros: ui("about_lede", "Una productora independiente de La Habana que filma cerca de la gente."),
  prensa: ui("press_lede", "Premios, selecciones, menciones en medios y materiales para periodistas."),
  noticias: ui("news_lede", "Estrenos, rodajes, convocatorias y lo que pasa detrás de cámaras."),
  contacto: ui("contact_lede", "Colaboraciones, encargos, prensa o distribución."),
  legal: "Aviso legal y política de privacidad de GORRIóN.",
};
const HOME_DESC = ui("hero_sub", "Productora audiovisual independiente de La Habana, Cuba.");
const HOME_H1 = stripTags(ui("hero_h1", "Cine independiente hecho en Cuba."));

/* ---------- Estructura de una página ---------- */
const template = read("tools/template.html");
function page({ path, title, desc, type = "website", image, imageAlt, noindex, ld = [], body }) {
  noindex = noindex || !INDEXAR;
  const url = SITE_URL + path;
  const img = image || OG_DEFAULT;
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    seo.googleVerification ? `<meta name="google-site-verification" content="${esc(seo.googleVerification)}">` : "",
    seo.bingVerification ? `<meta name="msvalidate.01" content="${esc(seo.bingVerification)}">` : "",
    noindex ? `<meta name="robots" content="noindex">` : `<meta name="robots" content="index,follow,max-image-preview:large">`,
    noindex ? "" : `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:site_name" content="${NAME}">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:locale" content="es_ES">`,
    `<meta property="og:locale:alternate" content="en_US">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(img)}">`,
    image ? "" : `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(imageAlt || `${NAME} · productora audiovisual independiente de La Habana`)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(img)}">`,
    ...ld.map(jsonld),
  ].filter(Boolean).join("\n");
  return template.replace("{{SEO}}", head).replace(/\{\{V\}\}/g, assetHash).replace("{{LITE}}", body).replace("{{ANALYTICS}}", ANALYTICS ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${ANALYTICS}", "spa": true}'></script>` : "").replace("<!doctype html>", "<!doctype html>\n" + MARK);
}

const link = (href, label, cls) => `<a href="${esc(href)}"${cls ? ` class="${cls}"` : ""}>${esc(label)}</a>`;
function shell(main, current) {
  const nav = NAV.map(([k, l]) => link(`/${k}/`, l, current === k ? "on" : "")).join("");
  const email = site.email ? `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>` : "";
  return `<div class="seo"><header class="seo__h"><a class="seo__brand" href="/">${NAME}</a><nav aria-label="Principal">${nav}</nav></header><main class="seo__m">${main}</main><footer class="seo__f"><span>© ${new Date().getFullYear()} ${NAME}</span> ${email} <a href="/legal/">Aviso legal y privacidad</a></footer></div>`;
}
const paras = (v) => (Array.isArray(v) ? v : String(v || "").split(/\n{2,}/)).filter((x) => String(x).trim()).map((x) => `<p>${esc(x)}</p>`).join("");
const breadcrumb = (items) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE_URL + path })) });
const ORG = () => {
  const sameAs = (site.social || []).map((s) => s && s.url).filter((u) => { try { const x = new URL(u); return x.pathname.replace(/\//g, "").length > 0; } catch (e) { return false; } });
  const o = { "@context": "https://schema.org", "@type": "Organization", name: NAME, url: SITE_URL + "/", logo: `${SITE_URL}/assets/icon-512.png`, description: HOME_DESC };
  if (site.email && !/\.example$/.test(site.email)) o.email = site.email;
  o.address = { "@type": "PostalAddress", addressLocality: "La Habana", addressCountry: "CU" };
  if (sameAs.length) o.sameAs = sameAs;
  return o;
};

/* ---------- Páginas ---------- */
const out = []; // { path, lastmod, priority }
const pages = {}; // fichero -> html

function projectList(items) {
  return `<ul class="seo__list">${items.map((p) => `<li>${link(`/proyectos/${p.slug}/`, p.title)} <span>${esc([typeLabel(p.type), p.year].filter(Boolean).join(" · "))}</span>${txt(p.short) ? `<p>${esc(cut(txt(p.short), 220))}</p>` : ""}</li>`).join("")}</ul>`;
}
function newsList(items) {
  return `<ul class="seo__list">${items.map((n) => `<li>${link(`/noticias/${n.slug}/`, txt(n.title))} <span>${esc(fmtDate(n.date))}</span>${txt(n.sum) ? `<p>${esc(cut(txt(n.sum), 220))}</p>` : ""}</li>`).join("")}</ul>`;
}
const validProjects = projects.filter((p) => p && p.title && slugOk(p.slug));
const validNews = news.filter((n) => n && txt(n.title) && slugOk(n.slug)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
projects.filter((p) => p && p.title && !slugOk(p.slug)).forEach((p) => console.warn(`⚠ Proyecto «${p.title}»: slug no válido («${p.slug}»), no se genera su página.`));
news.filter((n) => n && txt(n.title) && !slugOk(n.slug)).forEach((n) => console.warn(`⚠ Noticia «${txt(n.title)}»: slug no válido («${n.slug}»), no se genera su página.`));

/* Inicio */
{
  const feat = validProjects.find((p) => p.featured) || validProjects[0];
  const main = `<h1>${esc(HOME_H1)}</h1><p class="seo__lede">${esc(HOME_DESC)}</p>${feat ? `<h2>Proyecto destacado</h2>${projectList([feat])}` : ""}<h2>Proyectos</h2>${projectList(validProjects.slice(0, 8))}${validNews.length ? `<h2>Últimas noticias</h2>${newsList(validNews.slice(0, 4))}` : ""}`;
  pages["index.html"] = page({ path: "/", title: txt(seo.homeTitle) || `${NAME} · Productora audiovisual independiente de La Habana`, desc: cut(txt(seo.homeDesc) || HOME_DESC), ld: [ORG(), { "@context": "https://schema.org", "@type": "WebSite", name: NAME, url: SITE_URL + "/", inLanguage: ["es", "en", "fr", "pt", "it", "de"] }], body: shell(main, "") });
  out.push({ path: "/", priority: "1.0" });
}

/* Secciones */
const SECTION_TITLE = { proyectos: "Proyectos", servicios: "Servicios", nosotros: "Nosotros", prensa: "Prensa", noticias: "Noticias", contacto: "Contacto", legal: "Aviso legal y privacidad" };
function section(name, main, ld = []) {
  const o = (Array.isArray(seo.pages) ? seo.pages : []).find((x) => x && x.page === name) || {};
  pages[`${name}/index.html`] = page({ path: `/${name}/`, title: txt(o.title) || `${SECTION_TITLE[name]} · ${NAME}`, desc: cut(txt(o.description) || SECTION_DESC[name]), ld: [...ld, breadcrumb([["Inicio", "/"], [SECTION_TITLE[name], `/${name}/`]])], body: shell(`<h1>${esc(SECTION_TITLE[name])}</h1><p class="seo__lede">${esc(SECTION_DESC[name])}</p>${main}`, name) });
  out.push({ path: `/${name}/`, priority: name === "legal" ? "0.2" : "0.8" });
}
section("proyectos", projectList(validProjects));
section("servicios", `<ul class="seo__list">${(serv.services || []).filter((s) => s && s.t).map((s) => `<li><b>${esc(txt(s.t))}</b><p>${esc(txt(s.d))}</p>${Array.isArray(L(s.l)) && L(s.l).length ? `<ul>${L(s.l).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</li>`).join("")}</ul>${(serv.steps || []).length ? `<h2>Cómo trabajamos</h2><ol class="seo__list">${serv.steps.filter((s) => s && s.t).map((s) => `<li><b>${esc(txt(s.t))}</b><p>${esc(txt(s.d))}</p></li>`).join("")}</ol>` : ""}`);
section("nosotros", `${txt(about.press_bio) ? `<p>${esc(txt(about.press_bio))}</p>` : ""}${(about.values || []).length ? `<h2>Valores</h2><ul class="seo__list">${about.values.filter((v) => v && v.t).map((v) => `<li><b>${esc(txt(v.t))}</b><p>${esc(txt(v.d))}</p></li>`).join("")}</ul>` : ""}${(about.history || []).length ? `<h2>Historia</h2><ul class="seo__list">${about.history.filter((h) => h && h.t).map((h) => `<li><b>${esc(h.y)} · ${esc(txt(h.t))}</b><p>${esc(txt(h.d))}</p></li>`).join("")}</ul>` : ""}${team.length ? `<h2>Equipo</h2><ul class="seo__list">${team.filter((m) => m && m.n).map((m) => `<li><b>${esc(m.n)}</b> <span>${esc(txt(m.r))}</span><p>${esc(txt(m.b))}</p></li>`).join("")}</ul>` : ""}`, [ORG()]);
section("prensa", `${(press.awards || []).length ? `<h2>Premios y selecciones</h2><ul class="seo__list">${press.awards.filter((a) => a && a.a).map((a) => { const p = projBy(a.p); return `<li><b>${esc(a.y)} · ${esc(txt(a.a))}</b> <span>${esc(a.f)}${p ? " · " : ""}</span>${p ? link(`/proyectos/${p.slug}/`, p.title) : ""}</li>`; }).join("")}</ul>` : ""}${(press.press || []).length ? `<h2>En los medios</h2><ul class="seo__list">${press.press.filter((x) => x && x.t).map((x) => `<li>${x.url ? `<a href="${esc(x.url)}" rel="noopener">${esc(txt(x.t))}</a>` : `<b>${esc(txt(x.t))}</b>`} <span>${esc(x.s)} · ${esc(x.d)}</span><p>${esc(txt(x.x))}</p></li>`).join("")}</ul>` : ""}`);
section("noticias", newsList(validNews));
section("contacto", `<ul class="seo__list">${site.email ? `<li><b>Correo</b> <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>` : ""}${site.pressEmail ? `<li><b>Prensa</b> <a href="mailto:${esc(site.pressEmail)}">${esc(site.pressEmail)}</a></li>` : ""}${txt(site.city) ? `<li><b>Ciudad</b> ${esc(txt(site.city))}</li>` : ""}${(site.social || []).filter((s) => s && s.url).map((s) => `<li><b>${esc(s.name)}</b> <a href="${esc(s.url)}" rel="noopener">${esc(s.handle || s.url)}</a></li>`).join("")}</ul>`, [ORG()]);
section("legal", `<p>Titular: ${NAME}, productora audiovisual independiente con sede en La Habana, Cuba.${site.email ? ` Contacto: ${esc(site.email)}.` : ""}</p>${ANALYTICS ? `<p>${esc(ui("legal_stats", ""))}</p>` : ""}`);

/* Proyectos */
for (const p of validProjects) {
  const path = `/proyectos/${p.slug}/`;
  const desc = cut(txt(p.seoDesc) || txt(p.short) || txt(p.tagline) || `${p.title} · ${NAME}`);
  const dir = (p.crew || []).filter((c) => c && c.r === "direccion").flatMap((c) => String(c.n || "").split(/,| y /).map((x) => x.trim()).filter(Boolean));
  const mins = String(p.runtime || "").match(/(\d+)\s*min/i);
  const status = STATUS[p.status] ? STATUS[p.status].es : "";
  const ldType = p.type === "serie" ? "TVSeries" : p.type === "ficcion" || p.type === "documental" ? "Movie" : "CreativeWork";
  const ld = { "@context": "https://schema.org", "@type": ldType, name: p.title, description: desc, url: SITE_URL + path, inLanguage: undefined, productionCompany: { "@type": "Organization", name: NAME, url: SITE_URL + "/" } };
  if (p.poster) ld.image = abs(p.poster);
  if (p.year && p.status === "estrenado") ld.datePublished = String(p.year);
  if (p.type && TYPES[p.type]) ld.genre = TYPES[p.type].es;
  if (dir.length && ldType !== "CreativeWork") ld.director = dir.map((n) => ({ "@type": "Person", name: n }));
  if (mins && ldType === "Movie") ld.duration = `PT${+mins[1]}M`;
  const rel = validNews.filter((n) => n.project && projBy(n.project) === p);
  const main = `<p class="seo__crumb"><a href="/proyectos/">Proyectos</a> / ${esc(p.title)}</p><h1>${esc(p.title)}</h1><p class="seo__meta">${esc([typeLabel(p.type), txt(p.format), p.year, p.runtime, status].filter(Boolean).join(" · "))}</p>${txt(p.tagline) ? `<p class="seo__lede">${esc(txt(p.tagline))}</p>` : ""}${p.poster ? `<img class="seo__img" src="${esc(p.poster)}" alt="${esc(p.title)}" loading="lazy">` : ""}${paras(txt(p.short))}${paras(txt(p.long))}${(p.crew || []).length ? `<h2>Ficha técnica</h2><dl>${p.crew.filter((c) => c && ROLES[c.r]).map((c) => `<dt>${esc(ROLES[c.r].es)}</dt><dd>${esc(c.n)}</dd>`).join("")}</dl>` : ""}${txt(p.note) ? `<h2>Nota del director</h2><blockquote>${esc(txt(p.note))}${p.noteBy ? `<cite> — ${esc(p.noteBy)}</cite>` : ""}</blockquote>` : ""}${(p.journey || []).length ? `<h2>Recorrido</h2><ul class="seo__list">${p.journey.filter((j) => j && j.t).map((j) => `<li><b>${esc(j.d)}</b> ${esc(txt(j.t))} <span>${esc(j.p)}</span></li>`).join("")}</ul>` : ""}${(p.press || []).length ? `<h2>Prensa</h2>${p.press.filter((x) => x && x.q).map((x) => `<blockquote>${esc(txt(x.q))}<cite> — ${esc(x.s)}</cite></blockquote>`).join("")}` : ""}${(p.where || []).length ? `<h2>Dónde verla</h2><ul class="seo__list">${p.where.filter((w) => w && w.l).map((w) => `<li>${w.url ? `<a href="${esc(w.url)}" rel="noopener">${esc(txt(w.l))}</a>` : `<b>${esc(txt(w.l))}</b>`} <span>${esc(txt(w.n))}</span></li>`).join("")}</ul>` : ""}${rel.length ? `<h2>Noticias relacionadas</h2>${newsList(rel)}` : ""}`;
  pages[`proyectos/${p.slug}/index.html`] = page({ path, title: txt(p.seoTitle) || `${p.title} · ${NAME}`, desc, noindex: !!p.noindex, type: "video.movie", image: p.poster ? abs(p.poster) : "", imageAlt: p.poster ? `Cartel de ${p.title}` : "", ld: [ld, breadcrumb([["Inicio", "/"], ["Proyectos", "/proyectos/"], [p.title, path]])], body: shell(main, "proyectos") });
  if (!p.noindex) out.push({ path, priority: "0.7" });
}

/* Noticias */
for (const n of validNews) {
  const path = `/noticias/${n.slug}/`, title = txt(n.title);
  const body = Array.isArray(L(n.body)) ? L(n.body) : [];
  const desc = cut(txt(n.seoDesc) || txt(n.sum) || body[0] || title);
  const pr = n.project ? projBy(n.project) : null;
  const ld = { "@context": "https://schema.org", "@type": "NewsArticle", headline: cut(title, 110), description: desc, datePublished: String(n.date).slice(0, 10), inLanguage: "es", mainEntityOfPage: SITE_URL + path, author: { "@type": "Organization", name: NAME }, publisher: { "@type": "Organization", name: NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/assets/icon-512.png` } } };
  if (n.image) ld.image = abs(n.image);
  const main = `<p class="seo__crumb"><a href="/noticias/">Noticias</a> / ${esc(title)}</p><h1>${esc(title)}</h1><p class="seo__meta">${esc(fmtDate(n.date))}${NEWS_CATS[n.cat] ? " · " + esc(NEWS_CATS[n.cat].es) : ""}</p>${n.image ? `<img class="seo__img" src="${esc(n.image)}" alt="${esc(title)}" loading="lazy">` : ""}${txt(n.sum) ? `<p class="seo__lede">${esc(txt(n.sum))}</p>` : ""}${body.map((x) => `<p>${esc(x)}</p>`).join("")}${pr ? `<h2>Proyecto relacionado</h2>${projectList([pr])}` : ""}`;
  pages[`noticias/${n.slug}/index.html`] = page({ path, title: txt(n.seoTitle) || `${title} · ${NAME}`, desc, noindex: !!n.noindex, type: "article", image: n.image ? abs(n.image) : "", imageAlt: n.image ? title : "", ld: [ld, breadcrumb([["Inicio", "/"], ["Noticias", "/noticias/"], [title, path]])], body: shell(main, "noticias") });
  if (!n.noindex) out.push({ path, lastmod: String(n.date).slice(0, 10), priority: "0.6" });
}

/* 404: también sirve la web completa para direcciones nuevas que aún no tienen página generada */
pages["404.html"] = page({ path: "/404.html", title: `Página no encontrada · ${NAME}`, desc: "La página que buscas no existe.", noindex: true, body: shell(`<h1>Página no encontrada</h1><p class="seo__lede">La dirección no existe o ha cambiado. <a href="/">Volver al inicio</a>.</p>`, "") });

/* ---------- Limpieza de páginas generadas que ya no existen ---------- */
for (const base of ["proyectos", "noticias"]) {
  const dir = join(ROOT, base);
  if (!existsSync(dir)) continue;
  for (const d of readdirSync(dir)) {
    const f = join(dir, d, "index.html");
    if (!existsSync(f) || !statSync(join(dir, d)).isDirectory()) continue;
    if (!readFileSync(f, "utf8").slice(0, 200).includes(MARK)) continue;
    if (!(`${base}/${d}/index.html` in pages)) { rmSync(join(dir, d), { recursive: true, force: true }); console.log(`– Eliminada ${base}/${d}/`); }
  }
}
for (const [f, html] of Object.entries(pages)) write(f, html);

/* ---------- sitemap.xml, robots.txt, manifiesto ---------- */
const xml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${out.map((u) => `  <url><loc>${xml(SITE_URL + u.path)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.priority}</priority></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt", INDEXAR ? `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${SITE_URL}/sitemap.xml\n` : `User-agent: *\nDisallow: /\n`);
if (!INDEXAR) console.log("⚠ Indexación desactivada en Buscadores (SEO): la web NO aparecerá en Google.");
write("site.webmanifest", JSON.stringify({ name: NAME, short_name: NAME, description: HOME_DESC, start_url: "/", scope: "/", display: "standalone", background_color: "#000000", theme_color: "#000000", lang: "es", icons: [{ src: "/assets/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png" }, { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] }, null, 2) + "\n");

console.log(`✔ ${Object.keys(pages).length} páginas · ${out.length} direcciones en sitemap.xml · sitio ${SITE_URL}`);
