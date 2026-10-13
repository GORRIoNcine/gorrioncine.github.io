/* GORRIóN · Worker de estadísticas (Cloudflare Workers)
 *
 * Qué hace: el panel (/admin) le pide las visitas; el Worker comprueba que quien pregunta es una persona con
 * permiso de escritura en el repositorio de la web (la misma sesión de GitHub del panel), consulta Cloudflare
 * Web Analytics con una clave que solo vive aquí y devuelve un resumen. La clave nunca llega al navegador.
 *
 * Variables que hay que crear en el Worker (Settings → Variables and Secrets):
 *   CF_API_TOKEN   (Secret)  Token de API de Cloudflare con el permiso  Account · Account Analytics · Read
 *   CF_ACCOUNT_ID  (Text)    ID de tu cuenta de Cloudflare
 *   SITE_TAG       (Text, opcional)  «Site tag» del sitio en Web Analytics; si tienes un solo sitio no hace falta
 *   ALLOWED_ORIGINS (Text, opcional) Webs que pueden consultarlo, separadas por comas.
 *                   Por defecto: https://gorrioncine.github.io,https://gorrioncine.eu.org
 *   GH_REPO        (Text, opcional)  Por defecto: GORRIoNcine/gorrioncine.github.io
 */

const DEFAULT_ORIGINS = ["https://gorrioncine.github.io", "https://gorrioncine.eu.org"];
const DEFAULT_REPO = "GORRIoNcine/gorrioncine.github.io";
const GQL = "https://api.cloudflare.com/client/v4/graphql";

const okCache = new Map(); // sha256(token) -> expira (ms)

const DIMS = {
  country: "countryName",
  page: "requestPath",
  referrer: "refererHost",
  device: "deviceType",
  browser: "userAgentBrowser",
  os: "userAgentOS",
};

function cors(origin, env) {
  const list = (env.ALLOWED_ORIGINS ? String(env.ALLOWED_ORIGINS).split(",").map((s) => s.trim()) : DEFAULT_ORIGINS).filter(Boolean);
  const allow = list.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow || "null",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const json = (obj, status, headers) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });

async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/* Solo pasa quien tiene permiso de escritura en el repositorio de la web. */
async function canWrite(token, env) {
  const key = await sha256(token);
  const hit = okCache.get(key);
  if (hit && hit > Date.now()) return true;
  const r = await fetch("https://api.github.com/repos/" + (env.GH_REPO || DEFAULT_REPO), {
    headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "User-Agent": "gorrion-stats" },
  });
  if (!r.ok) return false;
  const j = await r.json();
  const ok = !!(j.permissions && (j.permissions.push || j.permissions.admin));
  if (ok) okCache.set(key, Date.now() + 5 * 60 * 1000);
  return ok;
}

async function gql(env, query, variables) {
  const r = await fetch(GQL, {
    method: "POST",
    headers: { Authorization: "Bearer " + env.CF_API_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || (j.errors && j.errors.length)) throw new Error((j.errors && j.errors[0] && j.errors[0].message) || "Cloudflare respondió " + r.status);
  const acc = j.data && j.data.viewer && j.data.viewer.accounts && j.data.viewer.accounts[0];
  if (!acc) throw new Error("No se encontró la cuenta (revisa CF_ACCOUNT_ID y el permiso del token).");
  return acc;
}

function filterFor(env) {
  return env.SITE_TAG ? "{ datetime_geq: $since, datetime_leq: $until, siteTag: $tag }" : "{ datetime_geq: $since, datetime_leq: $until }";
}
const vars = (env, since, until) => ({ acc: env.CF_ACCOUNT_ID, since, until, ...(env.SITE_TAG ? { tag: env.SITE_TAG } : {}) });
const decl = (env) => "$acc: String!, $since: Time!, $until: Time!" + (env.SITE_TAG ? ", $tag: String!" : "");

async function series(env, since, until) {
  const q = `query(${decl(env)}) { viewer { accounts(filter: { accountTag: $acc }) {
    rumPageloadEventsAdaptiveGroups(limit: 10000, filter: ${filterFor(env)}, orderBy: [datetimeHour_ASC]) { count sum { visits } dimensions { datetimeHour } }
  } } }`;
  const a = await gql(env, q, vars(env, since, until));
  return (a.rumPageloadEventsAdaptiveGroups || []).map((x) => ({ t: x.dimensions.datetimeHour, views: x.count, visits: x.sum ? x.sum.visits : 0 }));
}

async function breakdown(env, dim, since, until) {
  const q = `query(${decl(env)}) { viewer { accounts(filter: { accountTag: $acc }) {
    rumPageloadEventsAdaptiveGroups(limit: 15, filter: ${filterFor(env)}, orderBy: [count_DESC]) { count sum { visits } dimensions { ${dim} } }
  } } }`;
  const a = await gql(env, q, vars(env, since, until));
  return (a.rumPageloadEventsAdaptiveGroups || []).map((x) => ({ name: x.dimensions[dim] || "", views: x.count, visits: x.sum ? x.sum.visits : 0 }));
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const h = cors(origin, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    if (req.method !== "GET") return json({ error: "Método no permitido" }, 405, h);
    if (!h["Access-Control-Allow-Origin"] || h["Access-Control-Allow-Origin"] === "null") return json({ error: "Origen no permitido" }, 403, h);

    const m = (req.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/i);
    if (!m) return json({ error: "Falta la sesión de GitHub" }, 401, h);
    try { if (!(await canWrite(m[1], env))) return json({ error: "Tu cuenta no tiene permiso para ver las estadísticas" }, 403, h); }
    catch (e) { return json({ error: "No se pudo comprobar la sesión" }, 502, h); }

    if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) return json({ error: "Faltan CF_API_TOKEN o CF_ACCOUNT_ID en el Worker" }, 500, h);

    const days = Math.min(90, Math.max(1, parseInt(new URL(req.url).searchParams.get("days"), 10) || 7));
    const until = new Date();
    const since = new Date(until.getTime() - days * 86400000);
    const s = since.toISOString(), u = until.toISOString();

    const names = Object.keys(DIMS);
    const res = await Promise.allSettled([series(env, s, u), ...names.map((k) => breakdown(env, DIMS[k], s, u))]);
    const out = { days, since: s, until: u, series: [], breakdown: {}, errors: {} };
    if (res[0].status === "fulfilled") out.series = res[0].value; else out.errors.series = String(res[0].reason && res[0].reason.message || res[0].reason);
    names.forEach((k, i) => { const r = res[i + 1]; if (r.status === "fulfilled") out.breakdown[k] = r.value; else out.errors[k] = String(r.reason && r.reason.message || r.reason); });
    return json(out, 200, h);
  },
};
