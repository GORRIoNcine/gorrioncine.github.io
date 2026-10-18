/* GORRIóN · Worker del buzón de mensajes (Cloudflare Workers)
 *
 * Qué hace
 *   1. Recibe los formularios de la web (contacto, presupuesto, solicitudes, boletín).
 *   2. Comprueba que no es spam: campo trampa + Cloudflare Turnstile + límite por persona.
 *   3. Guarda el mensaje en una base de datos D1 (gratuita).
 *   4. Te avisa por correo.
 *   5. El panel (/admin → Mensajes) lee, marca, archiva y borra los mensajes. Solo pasa quien tiene permiso de
 *      escritura en el repositorio de la web (la misma sesión de GitHub del panel).
 *
 * Qué hay que crear en el Worker (Settings → Bindings / Variables and Secrets). Guía: tools/LEEME-BUZON.md
 *   DB               (D1 database binding)   Base de datos D1. La tabla se crea sola la primera vez.
 *   TURNSTILE_SECRET (Secret)   Clave secreta de Cloudflare Turnstile.
 *   NOTIFY_TO        (Text)     Correo donde quieres recibir los avisos.
 *   NOTIFY_FROM      (Text)     Remitente de los avisos, p. ej. buzon@gorrioncine.eu.org (ver guía).
 *   MAIL             (Send Email binding, opcional)  Para enviar con Cloudflare Email Routing.
 *   RESEND_API_KEY   (Secret, opcional)  Alternativa para enviar con Resend (resend.com), sin dominio propio.
 *   ALLOWED_ORIGINS  (Text, opcional)    Webs que pueden enviar y leer. Por defecto:
 *                    https://gorrioncine.github.io,https://gorrioncine.eu.org
 *   GH_REPO          (Text, opcional)    Por defecto: GORRIoNcine/gorrioncine.github.io
 */

const DEFAULT_ORIGINS = ["https://gorrioncine.github.io", "https://gorrioncine.eu.org"];
const DEFAULT_REPO = "GORRIoNcine/gorrioncine.github.io";
const MAX_BODY = 24 * 1024;
const LIMITS = { name: 120, email: 200, org: 160, subject: 200, message: 6000, short: 200 };
const KINDS = ["contact", "quote", "request", "newsletter"];
const STATUSES = ["new", "read", "archived", "spam"];
const RATE = { windowMin: 10, max: 5 };

const okCache = new Map(); // sha256(token) -> expira (ms)
let ready = false;

/* ---------- utilidades ---------- */
function allowed(env) {
  return (env.ALLOWED_ORIGINS ? String(env.ALLOWED_ORIGINS).split(",").map((s) => s.trim()) : DEFAULT_ORIGINS).filter(Boolean);
}
function cors(origin, env) {
  const allow = allowed(env).includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow || "null",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
const json = (obj, status, headers) => new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });

async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const clean = (v, max) => String(v == null ? "" : v).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
const oneLine = (v, max) => clean(v, max).replace(/\s*\n\s*/g, " ");
const EMAIL_RE = /^[^\s@<>",;:]+@[^\s@<>",;:]+\.[^\s@<>",;:]+$/;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- base de datos ---------- */
async function setup(env) {
  if (ready) return;
  await env.DB.batch([
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, kind TEXT NOT NULL, name TEXT, email TEXT, org TEXT, subject TEXT, message TEXT, extra TEXT, lang TEXT, page TEXT, status TEXT NOT NULL DEFAULT 'new', ip_hash TEXT)"
    ),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (status, id DESC)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_messages_ip ON messages (ip_hash, created_at)"),
  ]);
  ready = true;
}

/* ---------- permisos del panel ---------- */
async function canWrite(token, env) {
  const key = await sha256(token);
  const hit = okCache.get(key);
  if (hit && hit > Date.now()) return true;
  const r = await fetch("https://api.github.com/repos/" + (env.GH_REPO || DEFAULT_REPO), {
    headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "User-Agent": "gorrion-buzon" },
  });
  if (!r.ok) return false;
  const j = await r.json();
  const ok = !!(j.permissions && (j.permissions.push || j.permissions.admin));
  if (ok) okCache.set(key, Date.now() + 5 * 60 * 1000);
  return ok;
}
async function authorized(request, env) {
  const m = /^Bearer\s+(\S+)$/.exec(request.headers.get("Authorization") || "");
  return !!m && (await canWrite(m[1], env));
}

/* ---------- Turnstile ---------- */
async function turnstileOk(token, ip, env) {
  if (!env.TURNSTILE_SECRET) return true; // sin clave configurada no se exige (no recomendado)
  if (!token || typeof token !== "string" || token.length > 2048) return false;
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const j = await r.json();
    return !!j.success;
  } catch (e) {
    return false;
  }
}

/* ---------- aviso por correo ---------- */
const KIND_LABEL = { contact: "Contacto", quote: "Presupuesto", request: "Solicitud", newsletter: "Boletín" };

function buildMail(m, id) {
  const lines = [`${KIND_LABEL[m.kind] || m.kind} · ${m.name || "—"} <${m.email}>`];
  if (m.org) lines.push(`Organización: ${m.org}`);
  for (const [k, v] of Object.entries(m.extra)) lines.push(`${k}: ${v}`);
  lines.push("", m.message || "(sin mensaje)", "", `Mensaje n.º ${id} · respóndele directamente a este correo.`);
  const text = lines.join("\n");
  const html = `<div style="font:15px/1.5 system-ui,sans-serif;color:#111"><p style="margin:0 0 8px"><b>${esc(KIND_LABEL[m.kind] || m.kind)}</b> · ${esc(m.name || "—")} &lt;${esc(m.email)}&gt;</p>${m.org ? `<p style="margin:0 0 4px">Organización: ${esc(m.org)}</p>` : ""}${Object.entries(m.extra).map(([k, v]) => `<p style="margin:0 0 4px">${esc(k)}: ${esc(v)}</p>`).join("")}<pre style="white-space:pre-wrap;font:inherit;margin:16px 0;padding:12px;background:#f3f3f3;border-left:3px solid #8a1f17">${esc(m.message || "(sin mensaje)")}</pre><p style="color:#666;font-size:13px;margin:0">Mensaje n.º ${id}. Puedes responder directamente a este correo.</p></div>`;
  return { subject: `[GORRIóN] ${KIND_LABEL[m.kind] || "Mensaje"}: ${m.subject || m.name || m.email}`.slice(0, 180), text, html };
}

const b64 = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const wrap76 = (s) => s.replace(/.{1,76}/g, "$&\r\n").trimEnd();
const hdrWord = (s) => (/^[\x20-\x7E]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);

async function sendMail(env, m, id) {
  if (!env.NOTIFY_TO || !env.NOTIFY_FROM) return;
  const { subject, text, html } = buildMail(m, id);
  const replyTo = EMAIL_RE.test(m.email) ? m.email : "";
  if (env.RESEND_API_KEY) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.NOTIFY_FROM, to: [env.NOTIFY_TO], subject, text, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!r.ok) throw new Error("Resend " + r.status + " " + (await r.text()).slice(0, 200));
    return;
  }
  if (env.MAIL) {
    const { EmailMessage } = await import("cloudflare:email");
    const from = ((String(env.NOTIFY_FROM).match(/<([^>]+)>/) || [])[1] || String(env.NOTIFY_FROM)).trim();
    const bound = "gorrion" + (await sha256(String(id) + Date.now())).slice(0, 16);
    const raw = [
      `From: ${hdrWord("GORRIóN")} <${from}>`,
      `To: ${env.NOTIFY_TO}`,
      replyTo ? `Reply-To: ${replyTo}` : null,
      `Subject: ${hdrWord(subject)}`,
      `Message-ID: <${crypto.randomUUID()}@${from.split("@")[1] || "gorrion.local"}>`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${bound}"`,
      "",
      `--${bound}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      wrap76(b64(text)),
      `--${bound}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      wrap76(b64(html)),
      `--${bound}--`,
      "",
    ].filter((x) => x !== null).join("\r\n");
    await env.MAIL.send(new EmailMessage(from, env.NOTIFY_TO, raw));
  }
}

/* ---------- recibir un formulario ---------- */
async function receive(request, env, ctx, h) {
  const origin = request.headers.get("Origin") || "";
  if (origin && !allowed(env).includes(origin)) return json({ ok: false, error: "origin" }, 403, h);
  if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY) return json({ ok: false, error: "too_large" }, 413, h);
  let raw = "";
  try { raw = await request.text(); } catch (e) { return json({ ok: false, error: "bad_request" }, 400, h); }
  if (raw.length > MAX_BODY) return json({ ok: false, error: "too_large" }, 413, h);
  let d;
  try { d = JSON.parse(raw); } catch (e) { return json({ ok: false, error: "bad_request" }, 400, h); }
  if (!d || typeof d !== "object") return json({ ok: false, error: "bad_request" }, 400, h);

  if (d.website) return json({ ok: true }, 200, h); // campo trampa: se finge éxito

  const kind = KINDS.includes(d.kind) ? d.kind : d.subject === "Newsletter" ? "newsletter" : "contact";
  const m = {
    kind,
    name: oneLine(d.name, LIMITS.name),
    email: oneLine(d.email, LIMITS.email),
    org: oneLine(d.org, LIMITS.org),
    subject: oneLine(d.subject, LIMITS.subject),
    message: clean(d.message, LIMITS.message),
    lang: /^(es|en)$/.test(d.lang) ? d.lang : "es",
    page: oneLine(d.page, 300),
    extra: {},
  };
  const EXTRA = { reason: "Motivo", service: "Servicio", budget: "Presupuesto", deadline: "Fecha límite", project: "Proyecto", what: "Qué solicita" };
  for (const [k, label] of Object.entries(EXTRA)) { const v = oneLine(d[k], LIMITS.short); if (v) m.extra[label] = v; }
  if (!EMAIL_RE.test(m.email)) return json({ ok: false, error: "email" }, 422, h);
  if (kind !== "newsletter" && (!m.name || !m.message)) return json({ ok: false, error: "fields" }, 422, h);

  const ip = request.headers.get("CF-Connecting-IP") || "";
  const token = d.token || d["cf-turnstile-response"];
  if (!(await turnstileOk(token, ip, env))) return json({ ok: false, error: "turnstile" }, 403, h);

  await setup(env);
  const ipHash = ip ? (await sha256("gorrion|" + ip)).slice(0, 32) : "";
  if (ipHash) {
    const since = new Date(Date.now() - RATE.windowMin * 60 * 1000).toISOString();
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE ip_hash = ? AND created_at > ?").bind(ipHash, since).first();
    if (row && row.n >= RATE.max) return json({ ok: false, error: "rate" }, 429, { ...h, "Retry-After": String(RATE.windowMin * 60) });
  }
  const res = await env.DB.prepare("INSERT INTO messages (created_at, kind, name, email, org, subject, message, extra, lang, page, status, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)")
    .bind(new Date().toISOString(), m.kind, m.name, m.email, m.org, m.subject, m.message, JSON.stringify(m.extra), m.lang, m.page, ipHash).run();
  const id = res.meta && res.meta.last_row_id;
  ctx.waitUntil(sendMail(env, m, id).catch((e) => console.error("Aviso por correo falló:", e && e.message)));
  return json({ ok: true, id }, 200, h);
}

/* ---------- API del panel ---------- */
const rowOut = (r) => ({ id: r.id, created_at: r.created_at, kind: r.kind, name: r.name, email: r.email, org: r.org, subject: r.subject, message: r.message, extra: (() => { try { return JSON.parse(r.extra || "{}"); } catch (e) { return {}; } })(), lang: r.lang, page: r.page, status: r.status });

async function panel(request, env, url, h) {
  if (!(await authorized(request, env))) return json({ ok: false, error: "forbidden" }, 403, h);
  await setup(env);
  const path = url.pathname.replace(/\/+$/, "");
  const m = /^\/messages\/(\d+)$/.exec(path);

  if (request.method === "GET" && path === "/unread") {
    const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE status = 'new'").first();
    return json({ ok: true, unread: r ? r.n : 0 }, 200, h);
  }
  if (request.method === "GET" && path === "/messages") {
    const status = url.searchParams.get("status") || "";
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
    const before = Number(url.searchParams.get("before")) || 0;
    const where = [], args = [];
    if (STATUSES.includes(status)) { where.push("status = ?"); args.push(status); }
    else if (status === "inbox") where.push("status IN ('new','read')");
    if (before) { where.push("id < ?"); args.push(before); }
    const rows = await env.DB.prepare(`SELECT * FROM messages ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id DESC LIMIT ?`).bind(...args, limit + 1).all();
    const list = rows.results || [];
    const counts = await env.DB.prepare("SELECT status, COUNT(*) AS n FROM messages GROUP BY status").all();
    const c = { new: 0, read: 0, archived: 0, spam: 0 };
    for (const r of counts.results || []) c[r.status] = r.n;
    return json({ ok: true, items: list.slice(0, limit).map(rowOut), more: list.length > limit, counts: c }, 200, h);
  }
  if (m && request.method === "PATCH") {
    let b = {};
    try { b = await request.json(); } catch (e) { /* vacío */ }
    if (!STATUSES.includes(b.status)) return json({ ok: false, error: "status" }, 422, h);
    const r = await env.DB.prepare("UPDATE messages SET status = ? WHERE id = ?").bind(b.status, Number(m[1])).run();
    return json({ ok: true, changed: r.meta ? r.meta.changes : 0 }, 200, h);
  }
  if (m && request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(Number(m[1])).run();
    return json({ ok: true }, 200, h);
  }
  return json({ ok: false, error: "not_found" }, 404, h);
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const h = cors(origin, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/") return new Response("Buzón de GORRIóN: funcionando. Los mensajes se leen desde el panel.", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      if (!env.DB) return json({ ok: false, error: "Falta conectar la base de datos D1 (binding DB)." }, 500, h);
      if (request.method === "POST" && (url.pathname === "/" || url.pathname === "/submit")) return await receive(request, env, ctx, h);
      return await panel(request, env, url, h);
    } catch (e) {
      console.error(e && e.stack || e);
      return json({ ok: false, error: "server" }, 500, h);
    }
  },
};
