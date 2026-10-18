/* GORRIóN · Buzón de mensajes del panel (/admin → Mensajes)
   Lee los mensajes que el Worker (tools/inbox-worker.js) guarda cuando alguien usa los formularios de la web.
   Usa la sesión de GitHub del panel; solo la envía al Worker de confianza (ver INBOX_TRUSTED en index.html). */
(() => {
  "use strict";
  const TZ = "America/Havana";
  const KIND = { contact: "Contacto", quote: "Presupuesto", request: "Solicitud", newsletter: "Boletín" };
  const TABS = [["inbox", "Recibidos"], ["new", "Sin leer"], ["archived", "Archivados"], ["spam", "Spam"]];

  const css = `
.gi-top{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px;align-items:center}
.gi-top button.gi-tab{padding:7px 14px;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:var(--r);font:inherit;font-weight:600;cursor:pointer}
.gi-top button.gi-tab[aria-pressed=true]{background:var(--red);border-color:var(--red);color:#fff}
.gi-top .gi-n{display:inline-block;min-width:18px;margin-left:6px;padding:0 6px;border-radius:9px;background:rgba(127,127,127,.25);font-size:12px;line-height:18px;text-align:center}
.gi-list{display:grid;gap:10px;max-width:980px;margin:0;padding:0;list-style:none}
.gi-msg{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--line);border-radius:var(--r);overflow:hidden}
.gi-msg.is-new{border-left-color:var(--red2,#d4271c)}
.gi-head{all:unset;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;width:100%;padding:12px 16px;cursor:pointer}
.gi-head:focus-visible{outline:2px solid var(--red2,#d4271c);outline-offset:-2px}
.gi-who{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;min-width:0}
.gi-who b{font-size:15px}
.gi-msg:not(.is-new) .gi-who b{font-weight:600}
.gi-who span{color:var(--mute);font-size:13px;overflow:hidden;text-overflow:ellipsis}
.gi-when{color:var(--mute);font-size:12.5px;white-space:nowrap;text-align:right}
.gi-prev{grid-column:1/-1;color:var(--mute);font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gi-kind{display:inline-block;padding:1px 8px;border:1px solid var(--line);border-radius:10px;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.gi-body{padding:4px 16px 16px;border-top:1px solid var(--line)}
.gi-body[hidden]{display:none}
.gi-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:6px 16px;margin:12px 0}
.gi-meta div{font-size:13px}.gi-meta dt{color:var(--mute);font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.gi-meta dd{margin:0;overflow-wrap:anywhere}
.gi-text{white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0;padding:12px 14px;background:var(--bg2,rgba(127,127,127,.08));border-left:3px solid var(--red2,#8a1f17);font-size:14.5px;line-height:1.55}
.gi-act{display:flex;flex-wrap:wrap;gap:8px}
.gi-note{color:var(--mute);font-size:13px;margin:10px 0 0}
.gi-steps{margin:8px 0 0;padding-left:20px;line-height:1.7}
.gi-steps code{background:var(--chip);padding:1px 5px;border-radius:3px;font-size:12.5px}`;

  const fmtDate = (iso) => {
    try {
      const d = new Date(iso);
      const days = (Date.now() - d.getTime()) / 864e5;
      const opt = days < 1 ? { hour: "2-digit", minute: "2-digit" } : days < 300 ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" };
      return new Intl.DateTimeFormat("es", { timeZone: TZ, ...opt }).format(d);
    } catch (e) { return iso || ""; }
  };
  const fullDate = (iso) => { try { return new Intl.DateTimeFormat("es", { timeZone: TZ, dateStyle: "full", timeStyle: "short" }).format(new Date(iso)); } catch (e) { return iso || ""; } };

  window.GInbox = {
    async render(el, { h, pageHead, ico, token, toast, inboxUrl, refresh }) {
      if (!document.getElementById("gi-css")) { const s = document.createElement("style"); s.id = "gi-css"; s.textContent = css; document.head.append(s); }
      el.replaceChildren(pageHead("Mensajes", "Lo que llega desde los formularios de la web (contacto, presupuestos, solicitudes). Las horas son de Cuba.", []));
      const card = (title, ...kids) => h("section", { class: "ed-card2" }, h("h2", {}, title), h("div", { style: "padding:16px 18px" }, ...kids));

      let base = "";
      try {
        const r = await fetch("../content/site.json", { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        base = inboxUrl(await r.json());
      } catch (e) { /* configuración pendiente */ }

      if (!base) {
        el.append(card("Falta conectar el buzón",
          h("p", {}, "Para recibir los formularios aquí hace falta un pequeño servicio gratuito en Cloudflare (una sola vez):"),
          h("ol", { class: "gi-steps" },
            h("li", {}, "Crea una base de datos ", h("b", {}, "D1"), " y un Worker llamado ", h("code", {}, "gorrion-buzon"), " con el código de ", h("code", {}, "tools/inbox-worker.js"), "."),
            h("li", {}, "Crea el widget de ", h("b", {}, "Turnstile"), " (antispam) y pon su clave secreta en el Worker."),
            h("li", {}, "Indica el correo donde quieres recibir los avisos."),
            h("li", {}, "Pega la dirección del Worker en Ajustes del sitio → «Servicio de formularios» y la clave pública de Turnstile en «Turnstile: clave del sitio»."),
          ),
          h("p", { class: "gi-note" }, "La guía paso a paso está en tools/LEEME-BUZON.md. Mientras no esté conectado, los formularios preparan un correo para enviar desde el programa de correo del visitante.")));
        return;
      }

      let tab = "inbox", counts = { new: 0, read: 0, archived: 0, spam: 0 }, items = [], more = false, seq = 0;
      const top = h("div", { class: "gi-top", role: "group", "aria-label": "Filtrar mensajes" });
      const list = h("ul", { class: "gi-list" });
      const foot = h("div", { style: "max-width:980px;margin:16px 0" });
      el.append(top, list, foot);

      const api = async (path, opt = {}) => {
        const r = await fetch(base + path, { ...opt, headers: { Authorization: "Bearer " + token(), ...(opt.body ? { "Content-Type": "application/json" } : {}) }, redirect: "error" });
        if (r.status === 403) throw new Error("Tu cuenta no tiene permiso para ver los mensajes. Entra con la cuenta de GitHub que edita el sitio.");
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.ok === false) throw new Error(j.error === "server" ? "El buzón respondió con un error. Revisa los registros del Worker en Cloudflare." : j.error || "Error " + r.status);
        return j;
      };
      const countOf = (k) => k === "inbox" ? counts.new + counts.read : counts[k] || 0;

      const paintTabs = () => top.replaceChildren(
        ...TABS.map(([k, l]) => h("button", { type: "button", class: "gi-tab", "aria-pressed": String(k === tab), onclick: () => { tab = k; paintTabs(); load(); } }, l, h("span", { class: "gi-n" }, String(k === "new" ? counts.new : countOf(k))))),
        h("span", { class: "sp", style: "flex:1" }),
        h("button", { type: "button", class: "ed-btn ed-btn--ghost", onclick: () => load() }, ico("hist"), "Actualizar"));

      const setStatus = async (m, status) => {
        try { await api("/messages/" + m.id, { method: "PATCH", body: JSON.stringify({ status }) }); } catch (e) { toast(e.message, "err"); return false; }
        return true;
      };
      const afterChange = () => { load(true); if (refresh) refresh(); };

      const row = (m) => {
        const isNew = m.status === "new";
        const li = h("li", { class: "gi-msg" + (isNew ? " is-new" : "") });
        const body = h("div", { class: "gi-body", hidden: true });
        const head = h("button", { type: "button", class: "gi-head", "aria-expanded": "false", onclick: async () => {
          const open = body.hidden;
          body.hidden = !open; head.setAttribute("aria-expanded", String(open));
          if (open && m.status === "new") { if (await setStatus(m, "read")) { m.status = "read"; counts.new = Math.max(0, counts.new - 1); counts.read++; li.classList.remove("is-new"); paintTabs(); if (refresh) refresh(); } }
        } },
          h("span", { class: "gi-who" }, h("b", {}, m.name || m.email || "—"), h("span", { class: "gi-kind" }, KIND[m.kind] || m.kind), m.name ? h("span", {}, m.email) : null),
          h("span", { class: "gi-when", title: fullDate(m.created_at) }, fmtDate(m.created_at)),
          h("span", { class: "gi-prev" }, (m.message || m.subject || "").replace(/\s+/g, " ")));
        const meta = [["Correo", m.email], ["Organización", m.org], ...Object.entries(m.extra || {}), ["Idioma", m.lang === "en" ? "Inglés" : "Español"], ["Página", m.page]].filter(([, v]) => v);
        const reSubj = "Re: tu mensaje a GORRIóN";
        body.append(
          h("dl", { class: "gi-meta" }, meta.map(([k, v]) => h("div", {}, h("dt", {}, k), h("dd", {}, String(v))))),
          m.message ? h("div", { class: "gi-text" }, m.message) : h("p", { class: "gi-note" }, m.kind === "newsletter" ? "Suscripción al boletín (sin mensaje)." : "Sin mensaje."),
          h("div", { class: "gi-act" },
            h("a", { class: "ed-btn ed-btn--main", href: "mailto:" + encodeURIComponent(m.email).replace(/%40/g, "@") + "?subject=" + encodeURIComponent(reSubj) }, ico("mail"), "Responder"),
            m.status === "archived" || m.status === "spam"
              ? h("button", { type: "button", class: "ed-btn ed-btn--ghost", onclick: async () => { if (await setStatus(m, "read")) { toast("Movido a Recibidos"); afterChange(); } } }, "Devolver a Recibidos")
              : h("button", { type: "button", class: "ed-btn ed-btn--ghost", onclick: async () => { if (await setStatus(m, "archived")) { toast("Archivado"); afterChange(); } } }, "Archivar"),
            m.status !== "new" && m.status !== "spam" ? h("button", { type: "button", class: "ed-btn ed-btn--ghost", onclick: async () => { if (await setStatus(m, "new")) { toast("Marcado como sin leer"); afterChange(); } } }, "Marcar sin leer") : null,
            m.status !== "spam" ? h("button", { type: "button", class: "ed-btn ed-btn--ghost", onclick: async () => { if (await setStatus(m, "spam")) { toast("Marcado como spam"); afterChange(); } } }, "Es spam") : null,
            h("button", { type: "button", class: "ed-btn ed-btn--ghost", onclick: async () => {
              if (!confirm(`¿Eliminar para siempre el mensaje de ${m.name || m.email}?\n\nNo se puede deshacer.`)) return;
              try { await api("/messages/" + m.id, { method: "DELETE" }); toast("Mensaje eliminado"); afterChange(); } catch (e) { toast(e.message, "err"); }
            } }, "Eliminar")));
        li.append(head, body);
        return li;
      };

      async function load(keep) {
        const my = ++seq;
        if (!keep) { list.replaceChildren(h("li", { class: "ed-empty" }, "Cargando mensajes…")); foot.replaceChildren(); }
        try {
          const j = await api("/messages?status=" + tab + "&limit=30");
          if (my !== seq) return;
          counts = j.counts; items = j.items; more = j.more; paintTabs();
          list.replaceChildren(...(items.length ? items.map(row) : [h("li", { class: "ed-empty" }, tab === "new" ? "No hay mensajes sin leer. 🎉" : tab === "spam" ? "No hay spam." : tab === "archived" ? "No hay mensajes archivados." : "Todavía no ha llegado ningún mensaje.")]));
          paintMore();
        } catch (e) {
          if (my !== seq) return;
          paintTabs();
          list.replaceChildren(h("li", { class: "ed-empty", role: "alert" }, "No se pudieron cargar los mensajes: " + (e.message || e)));
        }
      }
      function paintMore() {
        foot.replaceChildren();
        if (!more) return;
        foot.append(h("button", { type: "button", class: "ed-btn ed-btn--ghost", onclick: async (ev) => {
          ev.currentTarget.disabled = true;
          try {
            const j = await api("/messages?status=" + tab + "&limit=30&before=" + items[items.length - 1].id);
            items = items.concat(j.items); more = j.more; j.items.forEach((m) => list.append(row(m))); paintMore();
          } catch (e) { toast(e.message, "err"); paintMore(); }
        } }, "Cargar más"));
      }
      paintTabs();
      load();
    },
  };
})();
