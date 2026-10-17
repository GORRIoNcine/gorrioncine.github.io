/* GORRIóN · Borradores y publicación programada
 *
 * Un proyecto, noticia, mención de prensa o premio queda OCULTO en la web si:
 *   · tiene «draft: true» (borrador), o
 *   · tiene «publishAt» (fecha y hora de Cuba, p. ej. 2026-11-05T09:00) y esa hora todavía no ha llegado.
 * Se usa al generar las páginas, al preparar la publicación (publish-filter.mjs) y, con la misma lógica, en assets/app.js. */
const TZ = "America/Havana";

/* Fecha y hora actuales en Cuba, "AAAA-MM-DDTHH:mm" (se compara como texto). */
export function nowHavana(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export const normAt = (s) => { s = String(s || "").trim(); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s + "T00:00" : s.slice(0, 16); };
export const isHidden = (x, now = nowHavana()) => !!x && typeof x === "object" && (x.draft === true || (!!x.publishAt && normAt(x.publishAt) > now));

/* Devuelve copias de proyectos / noticias / prensa solo con lo que debe verse. */
export function visibleContent({ proyectos, noticias, prensa }, now = nowHavana()) {
  const out = {};
  const hiddenProj = new Set();
  if (proyectos) {
    const items = (proyectos.items || []).filter((p) => { const h = isHidden(p, now); if (h && p && p.id) hiddenProj.add(p.id); if (h && p && p.slug) hiddenProj.add(p.slug); return !h; });
    out.proyectos = { ...proyectos, items };
  }
  if (noticias) {
    out.noticias = { ...noticias, items: (noticias.items || []).filter((n) => !isHidden(n, now)).map((n) => (n && n.project && hiddenProj.has(n.project) ? { ...n, project: null } : n)) };
  }
  if (prensa) {
    out.prensa = { ...prensa, press: (prensa.press || []).filter((x) => !isHidden(x, now)), awards: (prensa.awards || []).filter((a) => !isHidden(a, now) && !(a && a.p && hiddenProj.has(a.p))) };
  }
  return out;
}
