#!/usr/bin/env node
/* GORRIóN · Plantillas de correo para MailerLite (plan gratuito)
 *
 * Genera 7 correos con la identidad de la marca (negro, hueso, rojo; titulares condensados en mayúsculas, texto en
 * máquina de escribir, perforaciones de película) como HTML listo para pegar en el editor «Custom HTML» de MailerLite.
 * Los datos de ejemplo (proyectos, noticias, enlaces) se leen de content/*.json para que no queden desfasados.
 *
 *   node tools/mailerlite/build.mjs        → escribe tools/mailerlite/correos/*.html y tools/mailerlite/index.html
 *
 * HTML a la antigua a propósito (tablas, estilos en línea, 600 px): es lo único que se ve igual en Gmail, Outlook y móviles.
 * Etiquetas de MailerLite usadas: {$unsubscribe} (baja) y {$url} (ver en el navegador). */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const J = (n) => JSON.parse(readFileSync(join(root, "content", n + ".json"), "utf8"));
const site = J("site"), PR = J("proyectos").items, NW = J("noticias").items;
const BASE = String(site.siteUrl || "https://gorrioncine.github.io").replace(/\/+$/, "");
const IMG = BASE + "/assets/email/";

const C = { ink: "#000000", bone: "#efefef", red: "#5f140f", rec: "#d4271c", mute: "#a8a8a8", line: "#3a3a3a", panel: "#121212", amber: "#d9a441", green: "#3d8b5a" };
const F = { d: "'Franklin Gothic Medium','Libre Franklin','Arial Narrow','Helvetica Neue',Arial,sans-serif", m: "'Courier New',Courier,monospace" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const L = (o, l) => (typeof o === "string" ? o : (o && (o[l] || o.es || o.en)) || "");
const url = (es, en, l) => BASE + (l === "en" ? "/en" + en : es);
const STATUS = { desarrollo: ["Desarrollo", "In development", C.mute], produccion: ["En rodaje", "Shooting", C.rec], postproduccion: ["Postproducción", "Post-production", C.amber], estrenado: ["Estrenada", "Released", C.green] };
const proj = (slug) => PR.find((p) => p.slug === slug);
const projUrl = (p, l) => (l === "en" ? `${BASE}/en/projects/${p.slugEn || p.slug}/` : `${BASE}/proyectos/${p.slug}/`);
const newsUrl = (n, l) => (l === "en" ? `${BASE}/en/news/${n.slugEn || n.slug}/` : `${BASE}/noticias/${n.slug}/`);
const dateOf = (d, l) => new Intl.DateTimeFormat(l === "en" ? "en" : "es", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(d + "T00:00:00Z"));
const POSTER = { "venus-en-la-favela": "poster-venus.jpg", fangal: "poster-fangal.jpg" };

/* ---------- Piezas ---------- */
const perf = (n = 24, bg = C.ink, fg = C.bone) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg}"><tr><td align="center" style="padding:6px 0;line-height:0;font-size:0">${Array.from({ length: n }, () => `<span style="display:inline-block;width:8px;height:8px;background:${fg};margin:0 6px"></span>`).join("")}</td></tr></table>`;
const wordmark = () => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto"><tr><td style="background:${C.bone};padding:3px 16px 5px 16px;text-align:center">
  <div style="line-height:0;font-size:0;padding:2px 0 3px">${Array.from({ length: 9 }, () => `<span style="display:inline-block;width:5px;height:5px;background:${C.ink};margin:0 4px"></span>`).join("")}</div>
  <div style="font-family:${F.d};font-weight:bold;font-size:30px;line-height:34px;letter-spacing:.5px;color:${C.ink};text-transform:uppercase">GORRI<span style="font-size:24px">ó</span>N</div>
  <div style="line-height:0;font-size:0;padding:3px 0 2px">${Array.from({ length: 9 }, () => `<span style="display:inline-block;width:5px;height:5px;background:${C.ink};margin:0 4px"></span>`).join("")}</div></td></tr></table>`;
const eyebrow = (txt, color = C.rec) => `<p style="margin:0 0 14px;font-family:${F.m};font-size:12px;line-height:16px;letter-spacing:2.4px;text-transform:uppercase;color:${C.mute}"><span style="color:${color};font-size:14px">&#9679;</span>&nbsp; ${esc(txt)}</p>`;
const h1 = (txt) => `<h1 style="margin:0 0 18px;font-family:${F.d};font-weight:normal;font-size:46px;line-height:46px;letter-spacing:.4px;text-transform:uppercase;color:${C.bone}">${txt}</h1>`;
const h2 = (txt) => `<h2 style="margin:0 0 10px;font-family:${F.d};font-weight:normal;font-size:26px;line-height:28px;letter-spacing:.3px;text-transform:uppercase;color:${C.bone}">${txt}</h2>`;
const p = (txt, extra = "") => `<p style="margin:0 0 16px;font-family:${F.m};font-size:15px;line-height:24px;color:${C.bone};${extra}">${txt}</p>`;
const small = (txt) => `<p style="margin:0 0 10px;font-family:${F.m};font-size:12px;line-height:19px;color:${C.mute}">${txt}</p>`;
const btn = (label, href, ghost = false) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 12px 10px 0;display:inline-table"><tr><td bgcolor="${ghost ? C.ink : C.red}" style="background:${ghost ? C.ink : C.red};border:2px solid ${C.bone}"><a href="${esc(href)}" target="_blank" style="display:inline-block;padding:13px 22px;font-family:${F.m};font-size:13px;line-height:16px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${C.bone};text-decoration:none">${esc(label)}&nbsp;&rarr;</a></td></tr></table>`;
const rule = () => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:10px 0 22px"><div style="height:1px;line-height:1px;font-size:1px;border-top:1px dashed ${C.line}">&nbsp;</div></td></tr></table>`;
const bullets = (items) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px">${items.map((t) => `<tr><td width="22" valign="top" style="padding:5px 0;font-family:${F.m};font-size:15px;color:${C.rec}">&#9632;</td><td style="padding:5px 0;font-family:${F.m};font-size:15px;line-height:23px;color:${C.bone}">${t}</td></tr>`).join("")}</table>`;
const chip = (label, color) => `<span style="display:inline-block;padding:3px 10px;border:1px solid ${color};font-family:${F.m};font-size:11px;line-height:14px;letter-spacing:1.6px;text-transform:uppercase;color:${color === C.mute ? C.bone : color}">${esc(label)}</span>`;
const sectionBand = (inner, bg = C.panel) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg};border:1px solid ${C.line}"><tr><td style="padding:22px 24px">${inner}</td></tr></table><div style="height:20px;line-height:20px;font-size:0">&nbsp;</div>`;
const projectCard = (pj, l) => {
  const s = STATUS[pj.status] || STATUS.desarrollo, img = POSTER[pj.slug];
  const text = `${chip(l === "en" ? s[1] : s[0], s[2])}<h3 style="margin:12px 0 6px;font-family:${F.d};font-weight:normal;font-size:24px;line-height:26px;letter-spacing:.3px;text-transform:uppercase;color:${C.bone}">${esc(pj.title)}</h3>
    <p style="margin:0 0 8px;font-family:${F.m};font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:${C.mute}">${esc(L(pj.format, l))} &middot; ${esc(pj.year)}</p>
    <p style="margin:0 0 10px;font-family:${F.m};font-size:14px;line-height:21px;font-style:italic;color:${C.bone}">&ldquo;${esc(L(pj.tagline, l))}&rdquo;</p>
    <a href="${projUrl(pj, l)}" target="_blank" style="font-family:${F.m};font-size:12px;font-weight:bold;letter-spacing:1.8px;text-transform:uppercase;color:${C.bone};border-bottom:2px solid ${C.rec};text-decoration:none">${l === "en" ? "See project" : "Ver proyecto"}</a>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;border:1px solid ${C.line};background:${C.panel}"><tr>
    ${img ? `<td width="150" valign="top" class="stack" style="padding:0;width:150px"><a href="${projUrl(pj, l)}" target="_blank"><img src="${IMG}${img}" width="150" alt="${esc(pj.title)}" style="display:block;width:150px;max-width:100%;height:auto;border:0"></a></td>` : ""}
    <td valign="top" class="stack" style="padding:18px 20px">${text}</td></tr></table>`;
};

/* Bloque bilingüe: español primero, luego inglés bajo una línea «English» */
const bi = (es, en) => `${es}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:14px 0 26px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px dashed ${C.line};font-size:0;line-height:0;height:1px" width="42%">&nbsp;</td><td align="center" style="padding:0 12px;font-family:${F.m};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${C.mute};white-space:nowrap">English</td><td style="border-top:1px dashed ${C.line};font-size:0;line-height:0;height:1px" width="42%">&nbsp;</td></tr></table></td></tr></table>${en}`;

const footer = ({ why }) => `${perf(24)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:26px 28px 8px">
    ${wordmark()}
    <p style="margin:18px 0 6px;font-family:${F.m};font-size:12px;line-height:19px;color:${C.mute}">GORRI&oacute;N &middot; ${esc(L(site.city, "es"))} / ${esc(L(site.city, "en"))}</p>
    <p style="margin:0 0 14px;font-family:${F.m};font-size:12px;line-height:20px;color:${C.mute}"><a href="${BASE}/" target="_blank" style="color:${C.bone};text-decoration:underline">${BASE.replace(/^https?:\/\//, "")}</a>${(site.social || []).slice(0, 4).map((s) => ` &nbsp;&middot;&nbsp; <a href="${esc(s.url)}" target="_blank" style="color:${C.bone};text-decoration:underline">${esc(s.name)}</a>`).join("")}</p>
    <p style="margin:0 0 6px;font-family:${F.m};font-size:11px;line-height:17px;color:${C.mute}">${why}</p>
    <p style="margin:0 0 4px;font-family:${F.m};font-size:11px;line-height:17px;color:${C.mute}"><a href="{$unsubscribe}" style="color:${C.mute};text-decoration:underline">Darme de baja / Unsubscribe</a> &nbsp;&middot;&nbsp; <a href="{$url}" style="color:${C.mute};text-decoration:underline">Ver en el navegador / View in browser</a></p>
  </td></tr></table>`;

function layout({ title, pre, body, why }) {
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${esc(title)}</title>
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0;mso-table-rspace:0}
  img{-ms-interpolation-mode:bicubic}
  a{color:${C.bone}}
  @media only screen and (max-width:620px){
    .wrap{width:100%!important}
    .pad{padding-left:20px!important;padding-right:20px!important}
    .stack{display:block!important;width:100%!important}
    .stack img{width:100%!important}
    h1{font-size:38px!important;line-height:38px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.ink};color:${C.bone}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.ink}">${esc(pre)}${"&nbsp;&zwnj;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.ink}" style="background:${C.ink}"><tr><td align="center" style="padding:0">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${C.ink}">
  <tr><td>${perf(24)}</td></tr>
  <tr><td align="center" style="padding:26px 28px 22px">${wordmark()}</td></tr>
  <tr><td class="pad" style="padding:8px 36px 12px">${body}</td></tr>
  <tr><td>${footer({ why })}</td></tr>
</table>
</td></tr></table>
</body></html>
`;
}

/* ---------- Los 7 correos ---------- */
const WHY_NL = "Recibes este correo porque te suscribiste al bolet&iacute;n de GORRI&oacute;N. / You receive this email because you subscribed to the GORRI&oacute;N newsletter.";
const feat = ["venus-en-la-favela", "kinky", "cieno"].map(proj).filter(Boolean);
const lastNews = [...NW].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 3);
/* Tarjetas «vivas»: imágenes con dirección fija que regenera tools/mailerlite/cards.py en cada publicación.
   El correo se pega una sola vez en MailerLite y siempre muestra los proyectos actuales. */
const autoCards = (l) => [1, 2, 3].map((n) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px"><tr><td><a href="${BASE}${l === "en" ? "/ml/en/p" : "/ml/p"}${n}/" target="_blank"><img src="${IMG}auto/card-${n}-${l}.png" width="528" alt="${l === "en" ? "Featured project" : "Proyecto destacado"} ${n}" style="display:block;width:100%;max-width:528px;height:auto;border:0"></a></td></tr></table>`).join("");
const NOW = new Date(), MES = { es: new Intl.DateTimeFormat("es", { month: "long", year: "numeric" }).format(NOW), en: new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(NOW) };
const mail = site.pressEmail || "prensa@gorrion.example";

const EMAILS = [
  {
    file: "01-bienvenida", kind: "Automatización", name: "Bienvenida", when: "Al instante, cuando alguien entra en el grupo «Boletín»",
    desc: "Confirma la suscripción, dice qué se va a recibir y con qué frecuencia. Es el correo con más aperturas: aquí se fija el tono.",
    subject: "Ya estás dentro · You're in", pre: "Estrenos, rodajes y convocatorias. Pocas veces, sin ruido.",
    body: bi(
      eyebrow("Bienvenida") + h1("Ya estás<br>dentro.") + p("Gracias por suscribirte al bolet&iacute;n de <b>GORRI&oacute;N</b>, productora audiovisual independiente de La Habana.") + p("Te escribiremos pocas veces. Solo cuando haya algo que contar:") + bullets(["<b>Estrenos</b> y proyecciones", "<b>Rodajes</b> y detr&aacute;s de c&aacute;maras", "<b>Convocatorias</b> de equipo y casting"]) + btn("Ver proyectos", url("/proyectos/", "/projects/", "es")) + small("&iquest;No fuiste t&uacute;? Ignora este correo o d&aacute;te de baja abajo."),
      eyebrow("Welcome") + h1("You're<br>in.") + p("Thanks for subscribing to the <b>GORRI&oacute;N</b> newsletter &mdash; an independent film production company from Havana.") + p("We write rarely. Only when there is something to tell:") + bullets(["<b>Releases</b> and screenings", "<b>Shoots</b> and behind the scenes", "<b>Open calls</b> for crew and casting"]) + btn("See projects", url("/proyectos/", "/projects/", "en")) + small("Wasn&rsquo;t you? Ignore this email or unsubscribe below.")),
    why: WHY_NL,
  },
  {
    file: "02-conoce-el-trabajo", kind: "Automatización", name: "Conoce el trabajo", when: "3 días después de la bienvenida",
    desc: "Tres películas en distintas fases (estrenada, en rodaje, en postproducción) para que el lector entienda qué hace la productora.",
    subject: "Tres películas para empezar · Three films to start", pre: "Una estrenada, una en rodaje y una en montaje.",
    body: bi(
      eyebrow("Conoce el trabajo") + h1("Tres películas<br>para empezar.") + p("Cada proyecto tiene su propia fase. Estas tres est&aacute;n en momentos distintos del camino.") + autoCards("es") + rule() + p("&iquest;Tienes un proyecto o una idea? Cu&eacute;ntanos.") + btn("Escr&iacute;benos".replace("&iacute;", "í"), url("/contacto/", "/contact/", "es"), true),
      eyebrow("Meet the work") + h1("Three films<br>to start.") + p("Every project has its own phase. These three are at different points along the way.") + autoCards("en") + rule() + p("Do you have a project or an idea? Tell us.") + btn("Write to us", url("/contacto/", "/contact/", "en"), true)),
    why: WHY_NL,
  },
  {
    file: "03-reenganche", kind: "Automatización", name: "¿Seguimos en contacto?", when: "A los 90 días, solo a quien no ha abierto ningún correo",
    desc: "Higiene de lista: el plan gratuito permite 250 suscriptores, así que conviene dejar salir a quien ya no lee. Un clic mantiene la suscripción.",
    subject: "¿Seguimos en contacto? · Shall we keep in touch?", pre: "Un clic para seguir recibiéndolo. Si no, lo dejamos aquí.",
    body: bi(
      eyebrow("Un momento", C.amber) + h1("&iquest;Seguimos<br>en contacto?") + p("Hace un tiempo que no abres nuestros correos y no queremos llenarte la bandeja. Si el bolet&iacute;n te sigue interesando, pulsa el bot&oacute;n.") + btn("S&iacute;, quiero seguir", url("/", "/", "es") + "?seguir=1") + p("Si no, no tienes que hacer nada: dentro de dos semanas te daremos de baja y no volveremos a escribirte.", "margin-top:8px") + small("Gracias por haber estado. Las puertas siguen abiertas en gorrioncine.github.io."),
      eyebrow("One moment", C.amber) + h1("Shall we keep<br>in touch?") + p("You haven&rsquo;t opened our emails for a while and we don&rsquo;t want to clutter your inbox. If you still want the newsletter, press the button.") + btn("Yes, keep me in", url("/", "/", "en") + "?keep=1") + p("If not, you don&rsquo;t need to do anything: in two weeks we&rsquo;ll unsubscribe you and won&rsquo;t write again.", "margin-top:8px") + small("Thanks for being here. The doors stay open at gorrioncine.github.io.")),
    why: WHY_NL,
  },
  {
    file: "04-prensa-y-festivales", kind: "Automatización", name: "Material para prensa y festivales", when: "Al instante, cuando alguien entra en el grupo «Prensa y festivales»",
    desc: "Entrega automática del material y de la vía de contacto para periodistas, programadores y festivales. Ahorra responder lo mismo cada vez.",
    subject: "Material para prensa y festivales · Press & festival kit", pre: "Dossier, carteles, fotogramas y contacto de prensa.",
    body: bi(
      eyebrow("Prensa y festivales") + h1("Material<br>para prensa.") + p("Gracias por tu inter&eacute;s en GORRI&oacute;N. Aqu&iacute; tienes d&oacute;nde encontrar todo lo que suele hacer falta:") + bullets([`<b>Prensa y premios</b>: menciones, premios y selecciones`, "<b>Cada proyecto</b>: sinopsis, ficha t&eacute;cnica y fotogramas", "<b>Dossier, carteles y press kit</b>: se solicitan desde la p&aacute;gina de cada proyecto"]) + btn("Ir a Prensa", url("/prensa/", "/press/", "es")) + p(`Para entrevistas, screeners o proyecciones escribe a <a href="mailto:${esc(mail)}" style="color:${C.bone};text-decoration:underline">${esc(mail)}</a>.`, "margin-top:8px"),
      eyebrow("Press & festivals") + h1("Press<br>kit.") + p("Thanks for your interest in GORRI&Oacute;N. Here is where to find what is usually needed:") + bullets(["<b>Press and awards</b>: mentions, awards and selections", "<b>Each project</b>: synopsis, credits and stills", "<b>Dossier, posters and press kit</b>: request them from each project page"]) + btn("Go to Press", url("/prensa/", "/press/", "en")) + p(`For interviews, screeners or screenings write to <a href="mailto:${esc(mail)}" style="color:${C.bone};text-decoration:underline">${esc(mail)}</a>.`, "margin-top:8px")),
    why: "Recibes este correo porque pediste material de prensa o festivales en GORRI&oacute;N. / You receive this email because you requested press or festival material from GORRI&oacute;N.",
  },
  {
    file: "05-novedades", kind: "Campaña", name: "Novedades (boletín)", when: "Manual · 1 vez al mes",
    desc: "Resumen de noticias recientes. Se genera sola con las últimas 3 noticias del sitio (y el mes en curso).",
    subject: "Novedades de GORRIóN · GORRIóN news", pre: "Lo último: estrenos, rodajes y convocatorias.",
    body: bi(
      eyebrow("Novedades · " + MES.es.toUpperCase()) + h1("Lo que<br>pasó este mes.") + p("Lo &uacute;ltimo de GORRI&oacute;N: estas son las novedades m&aacute;s recientes.") + lastNews.map((n) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px dashed ${C.line}"><tr><td style="padding:16px 0 6px"><p style="margin:0 0 4px;font-family:${F.m};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.mute}">${esc(dateOf(n.date, "es"))}</p>${h2(esc(L(n.title, "es")))}${p(esc(L(n.sum, "es")), "margin-bottom:10px")}<a href="${newsUrl(n, "es")}" target="_blank" style="font-family:${F.m};font-size:12px;font-weight:bold;letter-spacing:1.8px;text-transform:uppercase;color:${C.bone};border-bottom:2px solid ${C.rec};text-decoration:none">Leer m&aacute;s</a></td></tr></table><div style="height:14px;line-height:14px;font-size:0">&nbsp;</div>`).join("") + btn("Todas las noticias", url("/noticias/", "/news/", "es"), true),
      eyebrow("News · " + MES.en.toUpperCase()) + h1("What happened<br>this month.") + p("The latest from GORRI&Oacute;N: here is our most recent news.") + lastNews.map((n) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px dashed ${C.line}"><tr><td style="padding:16px 0 6px"><p style="margin:0 0 4px;font-family:${F.m};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.mute}">${esc(dateOf(n.date, "en"))}</p>${h2(esc(L(n.title, "en")))}${p(esc(L(n.sum, "en")), "margin-bottom:10px")}<a href="${newsUrl(n, "en")}" target="_blank" style="font-family:${F.m};font-size:12px;font-weight:bold;letter-spacing:1.8px;text-transform:uppercase;color:${C.bone};border-bottom:2px solid ${C.rec};text-decoration:none">Read more</a></td></tr></table><div style="height:14px;line-height:14px;font-size:0">&nbsp;</div>`).join("") + btn("All news", url("/noticias/", "/news/", "en"), true)),
    why: WHY_NL,
  },
  {
    file: "06-estreno", kind: "Campaña", name: "Estreno o proyecto nuevo", when: "Manual · cuando haya un estreno, tráiler o proyecto nuevo",
    desc: "Cartel grande, fase del proyecto, ficha breve y dos botones. El ejemplo usa «Venus en la Favela»; sustituye el cartel, los textos y los enlaces.",
    subject: "[Título]: estreno · [Title]: release", pre: "[Una frase que haga querer abrir el correo.]",
    body: (() => { const v = proj("venus-en-la-favela") || PR[0], s = STATUS[v.status] || STATUS.desarrollo;
      const facts = (l) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px;border-top:1px solid ${C.line}">${[[l === "en" ? "Type" : "Tipo", L(v.format, l)], [l === "en" ? "Year" : "Año", v.year], [l === "en" ? "Runtime" : "Duración", v.runtime], [l === "en" ? "Genre" : "Género", L(v.genre, l)]].map(([k, val]) => `<tr><td width="38%" style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:${F.m};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.mute}">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:${F.d};font-size:19px;text-transform:uppercase;color:${C.bone}">${esc(val)}</td></tr>`).join("")}</table>`;
      const block = (l) => `${eyebrow(l === "en" ? "New release" : "Estreno", s[2])}<img src="${IMG}poster-venus.jpg" width="240" alt="${esc(v.title)}" style="display:block;width:240px;max-width:100%;height:auto;border:0;margin:0 0 22px;box-shadow:10px 10px 0 ${C.red}">${chip(l === "en" ? s[1] : s[0], s[2])}${h1(esc(v.title).replace(/ /g, "<br>").replace(/<br>(en|la|de|del)<br>/i, " $1 "))}<p style="margin:0 0 18px;font-family:${F.d};font-style:italic;font-size:24px;line-height:26px;color:${C.bone}">${esc(L(v.tagline, l))}</p>${facts(l)}${p(esc(L(v.short, l)))}${btn(l === "en" ? "See project" : "Ver proyecto", projUrl(v, l))}${btn(l === "en" ? "Watch trailer" : "Ver tráiler", projUrl(v, l) + "#trailer", true)}`;
      return bi(block("es"), block("en")); })(),
    why: WHY_NL,
  },
  {
    file: "07-convocatoria", kind: "Campaña", name: "Convocatoria (equipo o casting)", when: "Manual · cuando se abra una convocatoria",
    desc: "Qué se busca, para qué proyecto, fechas y cómo aplicar. Con una fecha límite clara y un solo botón.",
    subject: "Convocatoria: [qué buscamos] · Open call: [what we need]", pre: "[Rol o perfil]. Fecha límite: [fecha].",
    body: bi(
      eyebrow("Convocatoria abierta", C.rec) + h1("Buscamos<br>[rol o perfil].") + p("[Una frase sobre el proyecto y por qu&eacute; buscamos a alguien ahora.]") + sectionBand(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${[["Proyecto", "[Título]"], ["Fechas de rodaje", "[del __ al __]"], ["Lugar", "[Ciudad / locaciones]"], ["Fecha l&iacute;mite", "[__ de ______]"]].map(([k, v]) => `<tr><td width="40%" style="padding:7px 0;font-family:${F.m};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.mute}">${k}</td><td style="padding:7px 0;font-family:${F.d};font-size:19px;text-transform:uppercase;color:${C.bone}">${v}</td></tr>`).join("")}</table>`) + p("<b>Qu&eacute; buscamos</b>") + bullets(["[Requisito o experiencia 1]", "[Requisito o experiencia 2]", "[Requisito o experiencia 3]"]) + p("<b>C&oacute;mo aplicar</b>: escr&iacute;benos desde el formulario con tu nombre, tu trabajo previo y por qu&eacute; te interesa.") + btn("Aplicar", url("/contacto/", "/contact/", "es")),
      eyebrow("Open call", C.rec) + h1("We are looking<br>for [role].") + p("[One sentence about the project and why we are looking for someone now.]") + sectionBand(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${[["Project", "[Title]"], ["Shooting dates", "[from __ to __]"], ["Location", "[City / locations]"], ["Deadline", "[__ ______]"]].map(([k, v]) => `<tr><td width="40%" style="padding:7px 0;font-family:${F.m};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.mute}">${k}</td><td style="padding:7px 0;font-family:${F.d};font-size:19px;text-transform:uppercase;color:${C.bone}">${v}</td></tr>`).join("")}</table>`) + p("<b>What we are looking for</b>") + bullets(["[Requirement or experience 1]", "[Requirement or experience 2]", "[Requirement or experience 3]"]) + p("<b>How to apply</b>: write to us through the form with your name, your previous work and why you are interested.") + btn("Apply", url("/contacto/", "/contact/", "en"))),
    why: WHY_NL,
  },
];

mkdirSync(join(here, "correos"), { recursive: true });
for (const e of EMAILS) writeFileSync(join(here, "correos", e.file + ".html"), layout({ title: e.subject, pre: e.pre, body: e.body, why: e.why }));

/* Galería para revisar todos los correos */
const gallery = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Correos de GORRIóN · MailerLite</title>
<style>:root{color-scheme:dark}body{margin:0;background:#0b0b0b;color:#efefef;font:15px/1.5 system-ui,sans-serif}header,section{max-width:1180px;margin:0 auto;padding:28px 20px}h1{font:400 34px/1 "Franklin Gothic Medium","Arial Narrow",Arial,sans-serif;text-transform:uppercase;margin:0 0 8px}h2{font:400 22px/1.1 "Franklin Gothic Medium","Arial Narrow",Arial,sans-serif;text-transform:uppercase;margin:0}p{color:#a8a8a8;margin:6px 0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:22px}.c{border:1px solid #2c2c2c;background:#141414}.c div{padding:14px 16px}.c iframe{width:100%;height:520px;border:0;border-top:1px solid #2c2c2c;background:#000}.t{display:inline-block;padding:1px 9px;border:1px solid #5f140f;color:#e07a70;font-size:11px;letter-spacing:.1em;text-transform:uppercase}.t.a{border-color:#d9a441;color:#d9a441}b{color:#efefef}a{color:#efefef}</style></head><body>
<header><h1>Correos para MailerLite</h1><p>7 diseños para el plan gratuito: 4 automatizaciones (3 activas a la vez) y 3 campañas manuales. Abre cada uno para copiar su HTML. Guía: <a href="../LEEME-MAILERLITE.md">LEEME-MAILERLITE.md</a>.</p></header>
<section><div class="grid">${EMAILS.map((e) => `<article class="c"><div><span class="t ${e.kind === "Campaña" ? "a" : ""}">${e.kind}</span><h2 style="margin-top:8px">${esc(e.name)}</h2><p><b>Cu&aacute;ndo:</b> ${esc(e.when)}</p><p>${esc(e.desc)}</p><p><b>Asunto:</b> ${esc(e.subject)}</p><p><a href="correos/${e.file}.html">Abrir ${e.file}.html</a></p></div><iframe src="correos/${e.file}.html" title="${esc(e.name)}" loading="lazy"></iframe></article>`).join("")}</div></section></body></html>`;
writeFileSync(join(here, "index.html"), gallery);
writeFileSync(join(here, "correos.json"), JSON.stringify(EMAILS.map(({ file, kind, name, when, subject, pre }) => ({ file, kind, name, when, subject, preheader: pre })), null, 2));
console.log(`✔ ${EMAILS.length} correos en tools/mailerlite/correos/ y galería en tools/mailerlite/index.html`);
