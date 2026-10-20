#!/usr/bin/env node
/* GORRIóN · Crea cada mes en MailerLite el BORRADOR del boletín «Novedades» con las últimas noticias del sitio.
 * No envía nada: tú lo abres, lo revisas y pulsas «Send». Así nunca sale un correo sin que lo veas.
 *
 *   node tools/mailerlite/build.mjs && node tools/mailerlite/sync.mjs [--dry]
 *
 * Variables de entorno (en GitHub: Settings → Secrets and variables → Actions):
 *   MAILERLITE_API_KEY  (secreto) clave de la API de MailerLite
 *   ML_FROM_EMAIL       correo remitente YA verificado en MailerLite
 *   ML_FROM_NAME        nombre del remitente (por defecto GORRIóN)
 *   ML_GROUP            nombre del grupo destinatario (por defecto Boletín)
 * Sin clave, o con --dry, solo muestra lo que haría. */
import { readFileSync } from "node:fs";

const DRY = process.argv.includes("--dry") || !process.env.MAILERLITE_API_KEY;
const KEY = process.env.MAILERLITE_API_KEY, FROM = process.env.ML_FROM_EMAIL, FROM_NAME = process.env.ML_FROM_NAME || "GORRIóN", GROUP = process.env.ML_GROUP || "Boletín";
const API = "https://connect.mailerlite.com/api";
const fail = (m) => { console.error("✖ " + m); process.exit(1); };

const news = JSON.parse(readFileSync("content/noticias.json", "utf8")).items || [];
const newest = news.map((n) => String(n.date)).sort().pop();
const days = newest ? (Date.now() - new Date(newest + "T00:00:00Z")) / 864e5 : Infinity;
if (days > 35) { console.log(`Sin noticias en los últimos 35 días (la última es de ${newest || "—"}): no se crea borrador este mes.`); process.exit(0); }

const html = readFileSync("tools/mailerlite/correos/05-novedades.html", "utf8");
const meta = JSON.parse(readFileSync("tools/mailerlite/correos.json", "utf8")).find((e) => e.file === "05-novedades");
const now = new Date(), ym = now.toISOString().slice(0, 7);
const name = `Novedades ${ym}`;
const subject = meta.subject;

if (DRY) { console.log(`(simulación) Crearía el borrador «${name}» · asunto «${subject}» · grupo «${GROUP}» · ${html.length} caracteres de HTML.`); process.exit(0); }
if (!FROM) fail("Falta ML_FROM_EMAIL (el remitente verificado en MailerLite).");

async function call(method, path, body) {
  const r = await fetch(API + path, { method, headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json", Accept: "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t }; }
  if (!r.ok) fail(`MailerLite ${method} ${path} → ${r.status}: ${JSON.stringify(j).slice(0, 400)}`);
  return j;
}

const groups = (await call("GET", `/groups?filter[name]=${encodeURIComponent(GROUP)}&limit=25`)).data || [];
const g = groups.find((x) => x.name === GROUP) || groups[0];
if (!g) fail(`No existe el grupo «${GROUP}» en MailerLite.`);

const existing = (await call("GET", `/campaigns?limit=25&filter[status]=draft`)).data || [];
if (existing.some((c) => c.name === name)) { console.log(`Ya existe el borrador «${name}»: no se duplica.`); process.exit(0); }

const c = await call("POST", "/campaigns", { name, type: "regular", emails: [{ subject, from_name: FROM_NAME, from: FROM, content: html }], groups: [g.id] });
console.log(`✔ Borrador creado: «${name}» (id ${c.data?.id}). Ábrelo en MailerLite → Campaigns → Drafts, revísalo y envíalo.`);
