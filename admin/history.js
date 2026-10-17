/* GORRIóN · Historial del panel (/admin → Historial)
   Usa el historial de Git de GitHub: lista los guardados, muestra qué cambió y permite recuperar una versión anterior
   (de una sección entera o de un solo elemento). Restaurar NO borra nada: crea un guardado nuevo encima del actual,
   así que siempre se puede volver atrás. */
(() => {
  "use strict";
  const TZ = "America/Havana";
  const PAGE = 20;
  const NAMES = { site: "Ajustes del sitio", seo: "Buscadores (SEO)", proyectos: "Proyectos", noticias: "Noticias", equipo: "Equipo", servicios: "Servicios", nosotros: "Nosotros", prensa: "Prensa y premios", roles: "Cargos" };
  const css = `
.hx-b[hidden],.hx-a [hidden],.hx-list+.hx-a button[hidden]{display:none!important}
.hx-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:6px 0 14px}
.hx-sel{padding:8px 12px;border:1px solid var(--line);border-radius:var(--r);background:var(--card);color:var(--fg);font:inherit}
.hx-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.hx-c{border:1px solid var(--line);background:var(--card);border-radius:var(--r)}
.hx-h{display:flex;gap:12px;align-items:center;padding:12px 14px;cursor:pointer;width:100%;text-align:left;background:none;border:0;color:var(--fg);font:inherit}
.hx-h:focus-visible{outline:2px solid var(--red2);outline-offset:-2px}
.hx-dot{width:10px;height:10px;border-radius:50%;background:var(--red);flex:none}
.hx-t{flex:1;min-width:0}.hx-t b{display:block;font-weight:700;white-space:normal;overflow-wrap:anywhere}
.hx-t span{color:var(--mute);font-size:12.5px}
.hx-b{border-top:1px solid var(--line);padding:12px 14px;display:grid;gap:14px}
.hx-f h4{margin:0 0 6px;font-size:14px}
.hx-f ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.hx-f li{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:14px}
.hx-k{font-size:11.5px;font-weight:700;padding:1px 8px;border-radius:10px;background:var(--chip);color:var(--mute)}
.hx-k.add{color:var(--ok)}.hx-k.del{color:#b3261e}.hx-k.mod{color:var(--warn)}
.hx-a{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.hx-s{padding:6px 11px;font-size:13px}
.hx-m{color:var(--mute);font-size:13px}
`;

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const L = (o) => (o == null ? "" : typeof o === "string" ? o : typeof o !== "object" ? String(o) : o.es || o.en || "");
  const labelOf = (o, i) => (o && typeof o === "object" ? L(o.title) || L(o.name) || L(o.t) || L(o.n) || L(o.a) || L(o.s) || L(o.y) || o.slug || o.id : "") || `Elemento ${i + 1}`;
  const keyOf = (o, i) => (o && typeof o === "object" && (o.id || o.slug)) || null;
  const rt = (() => { try { return new Intl.RelativeTimeFormat("es", { numeric: "auto" }); } catch (e) { return null; } })();
  const ago = (d) => {
    const s = (new Date(d) - Date.now()) / 1000;
    if (rt) for (const [k, v] of [["day", 86400], ["hour", 3600], ["minute", 60]]) if (Math.abs(s) >= v) return rt.format(Math.round(s / v), k);
    return "ahora";
  };
  const when = (d) => new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short", timeZone: TZ }).format(new Date(d));

  /* Diferencias entre dos versiones de un archivo de contenido, en palabras. */
  function diff(a, b) {
    const out = [];
    const keys = [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])];
    for (const k of keys) {
      const x = (a || {})[k], y = (b || {})[k];
      if (same(x, y)) continue;
      if (Array.isArray(x || []) && Array.isArray(y || []) && [...(x || []), ...(y || [])].some((v) => v && typeof v === "object")) {
        const xs = x || [], ys = y || [], seen = new Set();
        ys.forEach((v, i) => {
          const key = keyOf(v, i), o = key ? xs.find((q, j) => keyOf(q, j) === key) : xs[i];
          if (key) seen.add(key); else seen.add("#" + i);
          if (o === undefined) out.push({ kind: "add", path: k, key, item: v, old: null, label: labelOf(v, i) });
          else if (!same(o, v)) out.push({ kind: "mod", path: k, key, item: v, old: o, label: labelOf(v, i), idx: i });
        });
        xs.forEach((v, i) => {
          const key = keyOf(v, i);
          if (key ? !seen.has(key) : i >= ys.length) out.push({ kind: "del", path: k, key, item: null, old: v, label: labelOf(v, i), idx: i });
        });
      } else out.push({ kind: "mod", path: k, key: null, whole: true, item: y, old: x, label: "Ajuste «" + k + "»" });
    }
    return out;
  }
  const KIND = { add: ["Añadido", "add"], mod: ["Modificado", "mod"], del: ["Eliminado", "del"] };

  function render(el, ctx) {
    const { h, pageHead, token, repo, sections } = ctx;
    if (!document.getElementById("hx-css")) { const st = document.createElement("style"); st.id = "hx-css"; st.textContent = css; document.head.append(st); }
    const API = "https://api.github.com/repos/" + repo;
    const hd = () => ({ Authorization: "Bearer " + token(), Accept: "application/vnd.github+json" });
    const b64d = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
    const b64e = (s) => { let x = ""; new TextEncoder().encode(s).forEach((c) => (x += String.fromCharCode(c))); return btoa(x); };
    const api = async (u) => { const r = await fetch(API + u, { headers: hd(), cache: "no-store" }); if (!r.ok) throw new Error("GitHub " + r.status); return r.json(); };
    const fileAt = async (path, ref) => { const r = await fetch(`${API}/contents/${path}?ref=${encodeURIComponent(ref)}`, { headers: hd(), cache: "no-store" }); if (r.status === 404) return null; if (!r.ok) throw new Error("GitHub " + r.status); const j = await r.json(); return { data: JSON.parse(b64d(j.content)), sha: j.sha }; };
    const putFile = async (path, data, sha, message) => {
      const r = await fetch(`${API}/contents/${path}`, { method: "PUT", headers: { ...hd(), "Content-Type": "application/json" }, body: JSON.stringify({ message, content: b64e(JSON.stringify(data, null, 2) + "\n"), sha, branch: "main" }) });
      if (r.status === 409 || r.status === 422) throw new Error("Alguien guardó cambios mientras tanto. Recarga el historial e inténtalo otra vez.");
      if (r.status === 401 || r.status === 403) throw new Error("Tu sesión no tiene permiso para guardar. Cierra sesión y entra de nuevo.");
      if (!r.ok) throw new Error("GitHub " + r.status);
    };
    const toast = (m, k) => window.GADMIN.toast(m, k);
    const nameOf = (p) => NAMES[p.replace(/^content\/|\.json$/g, "")] || ((sections || []).find((s) => s[0] === p.replace(/^content\/|\.json$/g, "")) || [])[1] || p;

    const list = h("ul", { class: "hx-list" }), more = h("button", { type: "button", class: "ed-btn", hidden: true }, "Cargar más");
    const sel = h("select", { class: "hx-sel", "aria-label": "Filtrar por sección" }, h("option", { value: "content" }, "Todas las secciones"),
      ...["proyectos", "noticias", "equipo", "servicios", "nosotros", "prensa", "seo", "site"].map((n) => h("option", { value: "content/" + n + ".json" }, nameOf(n))));
    el.replaceChildren(pageHead("Historial", "Cada vez que guardas, GitHub conserva la versión anterior. Aquí puedes ver qué cambió y recuperar una versión sin perder el resto del trabajo.", []),
      h("div", { class: "hx-bar" }, sel, h("span", { class: "hx-m" }, "Restaurar crea un guardado nuevo: nunca se pierde nada.")), list, h("div", { class: "hx-a" }, more));

    let page = 1;
    async function load(reset) {
      if (reset) { page = 1; list.replaceChildren(); }
      more.hidden = true;
      if (reset) list.append(h("li", { class: "ed-empty" }, "Cargando…"));
      let cs;
      try { cs = await api(`/commits?sha=main&path=${encodeURIComponent(sel.value)}&per_page=${PAGE}&page=${page}`); }
      catch (e) { list.replaceChildren(h("li", { class: "ed-empty" }, "No se pudo leer el historial: " + (e.message || e))); return; }
      if (reset) list.replaceChildren();
      if (!cs.length && reset) list.append(h("li", { class: "ed-empty" }, "Todavía no hay cambios guardados en esta sección."));
      cs.forEach((c) => list.append(card(c)));
      more.hidden = cs.length < PAGE; page++;
    }

    function card(c) {
      const body = h("div", { class: "hx-b", hidden: true });
      let loaded = false;
      const head = h("button", { type: "button", class: "hx-h", "aria-expanded": "false" }, h("span", { class: "hx-dot" }),
        h("span", { class: "hx-t" }, h("b", {}, (c.commit.message || "").split("\n")[0]), h("span", {}, `${c.commit.author.name} · ${when(c.commit.author.date)} (${ago(c.commit.author.date)})`)),
        h("span", { class: "hx-k" }, "Ver cambios"));
      head.addEventListener("click", async () => {
        const open = body.hidden; body.hidden = !open; head.setAttribute("aria-expanded", String(open));
        if (open && !loaded) { loaded = true; await fill(c, body); }
      });
      return h("li", { class: "hx-c" }, head, body);
    }

    async function fill(c, body) {
      body.replaceChildren(h("p", { class: "hx-m" }, "Calculando cambios…"));
      let full;
      try { full = await api("/commits/" + c.sha); } catch (e) { body.replaceChildren(h("p", { class: "hx-m" }, "No se pudo leer este cambio.")); return; }
      const parent = full.parents && full.parents[0] && full.parents[0].sha;
      const files = (full.files || []).filter((f) => /^content\/[\w-]+\.json$/.test(f.filename));
      const others = (full.files || []).length - files.length;
      body.replaceChildren();
      if (!files.length) body.append(h("p", { class: "hx-m" }, "Este guardado no cambió contenido (solo imágenes o código de la web)."));
      for (const f of files) {
        const box = h("div", { class: "hx-f" }, h("h4", {}, nameOf(f.filename)));
        body.append(box);
        try {
          const after = await fileAt(f.filename, c.sha), before = parent && f.status !== "added" ? await fileAt(f.filename, parent) : null;
          const ch = diff(before && before.data, after && after.data);
          const ul = h("ul", {});
          ch.forEach((d) => {
            const [kl, kc] = KIND[d.kind];
            const li = h("li", {}, h("span", { class: "hx-k " + kc }, kl), h("span", {}, d.label));
            if (d.old != null && d.kind !== "add") li.append(h("button", { type: "button", class: "ed-btn ed-btn--ghost hx-s", onclick: () => restoreItem(f.filename, d, c) }, d.kind === "del" ? "Recuperar" : "Volver a la versión anterior"));
            ul.append(li);
          });
          box.append(ch.length ? ul : h("p", { class: "hx-m" }, "Sin diferencias de contenido."));
          const acts = h("div", { class: "hx-a" });
          if (before) acts.append(h("button", { type: "button", class: "ed-btn hx-s", onclick: () => restoreFile(f.filename, before.data, "antes de «" + (c.commit.message || "").split("\n")[0] + "»", c) }, "Restaurar la sección a antes de este cambio"));
          if (after) acts.append(h("button", { type: "button", class: "ed-btn hx-s", onclick: () => restoreFile(f.filename, after.data, "esta versión (" + when(c.commit.author.date) + ")", c) }, "Restaurar la sección a esta versión"));
          box.append(acts);
        } catch (e) { box.append(h("p", { class: "hx-m" }, "No se pudo leer este archivo.")); }
      }
      if (others > 0 && files.length) body.append(h("p", { class: "hx-m" }, `Además cambió ${others} archivo(s) que no son de contenido (imágenes o código).`));
    }

    async function current(path) { const r = await fileAt(path, "main"); if (!r) throw new Error("No se encontró " + path); return r; }

    async function restoreFile(path, data, what, c) {
      if (!confirm(`¿Restaurar «${nameOf(path)}» a ${what}?\n\nSe sustituirá el contenido actual de esa sección. Se guarda como un cambio nuevo, así que luego puedes volver a la versión de ahora desde este mismo historial.`)) return;
      try {
        const cur = await current(path);
        await putFile(path, data, cur.sha, `Restaura «${nameOf(path)}» a ${what.replace(/«|»/g, "")} desde el panel`);
        toast("Restaurado. La web se actualizará en 1–2 minutos.", "ok"); load(true);
      } catch (e) { toast(e.message || "No se pudo restaurar.", "err"); }
    }

    async function restoreItem(path, d, c) {
      const verb = d.kind === "del" ? "Recuperar" : "Devolver a su versión anterior";
      if (!confirm(`${verb}: «${d.label}» (${nameOf(path)}).\n\nSolo se toca este elemento; el resto de la sección se queda como está ahora.`)) return;
      try {
        const cur = await current(path), data = clone(cur.data);
        if (d.whole) data[d.path] = clone(d.old);
        else {
          const arr = Array.isArray(data[d.path]) ? data[d.path] : (data[d.path] = []);
          const i = d.key ? arr.findIndex((q, j) => keyOf(q, j) === d.key) : -1;
          if (i >= 0) arr[i] = clone(d.old); else arr.push(clone(d.old));
        }
        await putFile(path, data, cur.sha, `${d.kind === "del" ? "Recupera" : "Restaura"} «${d.label}» en ${nameOf(path)} desde el panel`);
        toast("Listo. La web se actualizará en 1–2 minutos.", "ok"); load(true);
      } catch (e) { toast(e.message || "No se pudo restaurar.", "err"); }
    }

    sel.addEventListener("change", () => load(true));
    more.addEventListener("click", () => load(false));
    load(true);
  }
  window.GHistory = { render };
})();
