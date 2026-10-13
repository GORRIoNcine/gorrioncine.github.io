/* GORRIóN · Estadísticas del panel (/admin → Estadísticas)
   Pide el resumen al Worker de Cloudflare (tools/stats-worker.js) con la sesión de GitHub del panel.
   Gráficas sencillas en HTML/CSS, sin librerías. Las horas se muestran en horario de Cuba. */
(() => {
  "use strict";
  const TZ = "America/Havana";
  const nf = new Intl.NumberFormat("es");
  const fmt = (n) => nf.format(Math.round(n || 0));
  const DEVICES = { desktop: "Ordenador", mobile: "Móvil", tablet: "Tableta", unknown: "Desconocido" };
  let regions = null;
  try { regions = new Intl.DisplayNames(["es"], { type: "region" }); } catch (e) { /* nada */ }
  const country = (c) => { if (!c) return "Desconocido"; if (c === "XX" || c === "T1") return c === "T1" ? "Red Tor" : "Desconocido"; try { return (regions && regions.of(c)) || c; } catch (e) { return c; } };

  const css = `
.gs-top{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}
.gs-top button{padding:7px 14px;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:var(--r);font:inherit;font-weight:600;cursor:pointer}
.gs-top button[aria-pressed=true]{background:var(--red);border-color:var(--red);color:#fff}
.gs-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:0 0 16px;max-width:980px}
.gs-kpi{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px}
.gs-kpi b{display:block;font-size:30px;line-height:1.1;font-variant-numeric:tabular-nums}
.gs-kpi span{color:var(--mute);font-size:13px}
.gs-body{padding:16px 18px}
.gs-bars{display:flex;align-items:flex-end;gap:2px;height:170px;border-bottom:1px solid var(--line)}
.gs-bar{flex:1 1 0;min-width:2px;background:#8a1f17;border-radius:3px 3px 0 0;position:relative;min-height:2px}
.gs-bar:hover,.gs-bar:focus{background:var(--fg);outline:none}
.gs-bar.gs-zero{background:var(--line)}
.gs-axis{display:flex;justify-content:space-between;color:var(--mute);font-size:12px;margin-top:6px}
.gs-note{color:var(--mute);font-size:13px;margin:10px 0 0}
.gs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;max-width:980px}
.gs-grid .ed-card2{margin:0;max-width:none}
.gs-list{list-style:none;margin:0;padding:0}
.gs-list li{position:relative;display:flex;justify-content:space-between;gap:12px;padding:7px 10px;margin:0 0 3px;border-radius:3px;overflow:hidden;font-size:14px}
.gs-list li i{position:absolute;left:0;top:0;bottom:0;background:#8a1f17;opacity:.16;border-radius:3px}
.gs-list li span{position:relative;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gs-list li em{position:relative;font-style:normal;font-variant-numeric:tabular-nums;font-weight:600}
.gs-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
.gs-table th,.gs-table td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
.gs-steps{margin:8px 0 0;padding-left:20px;line-height:1.7}
.gs-steps code{background:var(--chip);padding:1px 5px;border-radius:3px;font-size:12.5px}
@media (prefers-color-scheme:dark){.gs-bar,.gs-list li i{background:#d0574d}.gs-list li i{opacity:.22}}
`;

  function fmtDay(key) { const [y, m, d] = key.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" }); }
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const hourOf = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false });

  function buckets(series, days) {
    const hourly = days <= 1;
    const map = new Map();
    series.forEach((p) => {
      const d = new Date(p.t);
      const key = hourly ? dayKey.format(d) + " " + hourOf.format(d).slice(0, 2) : dayKey.format(d);
      const b = map.get(key) || { key, views: 0, visits: 0 };
      b.views += p.views; b.visits += p.visits; map.set(key, b);
    });
    // Rellena los días/horas sin visitas para que el eje sea continuo.
    const out = [];
    const end = Date.now(), n = hourly ? 24 : days;
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(end - i * (hourly ? 3600000 : 86400000));
      const key = hourly ? dayKey.format(d) + " " + hourOf.format(d).slice(0, 2) : dayKey.format(d);
      if (!out.length || out[out.length - 1].key !== key) out.push(map.get(key) || { key, views: 0, visits: 0 });
    }
    return { out, hourly };
  }

  function byHourOfDay(series) {
    const a = Array.from({ length: 24 }, (_, i) => ({ key: String(i).padStart(2, "0"), views: 0, visits: 0 }));
    series.forEach((p) => { const h = parseInt(hourOf.format(new Date(p.t)), 10) % 24; a[h].views += p.views; a[h].visits += p.visits; });
    return a;
  }

  window.GStats = {
    async render(el, { h, pageHead, ico, token }) {
      if (!document.getElementById("gs-css")) { const s = document.createElement("style"); s.id = "gs-css"; s.textContent = css; document.head.append(s); }
      el.replaceChildren(pageHead("Estadísticas", "Visitas a la web (Cloudflare Web Analytics, sin cookies). Las horas son de Cuba.", []));
      const card = (title, ...kids) => h("section", { class: "ed-card2" }, h("h2", {}, title), h("div", { class: "gs-body" }, ...kids));

      let url = "";
      try { const s = await fetch("../content/site.json", { cache: "no-store" }).then((r) => r.json()); url = String(s.statsUrl || "").trim().replace(/\/+$/, ""); } catch (e) { /* nada */ }

      if (!url) {
        el.append(card("Falta conectar las estadísticas",
          h("p", {}, "Las visitas ya se están contando. Para verlas aquí hace falta un pequeño servicio gratuito en Cloudflare (una sola vez):"),
          h("ol", { class: "gs-steps" },
            h("li", {}, "En Cloudflare crea un ", h("b", {}, "token de API"), " (Mi perfil → Tokens de API → Crear token personalizado) con el permiso ", h("code", {}, "Cuenta · Análisis de la cuenta · Lectura"), "."),
            h("li", {}, "Crea un Worker llamado ", h("code", {}, "gorrion-stats"), " y pega el código del archivo ", h("code", {}, "tools/stats-worker.js"), "."),
            h("li", {}, "En el Worker añade las variables ", h("code", {}, "CF_API_TOKEN"), " (secreta) y ", h("code", {}, "CF_ACCOUNT_ID"), "."),
            h("li", {}, "Copia la dirección del Worker en Ajustes del sitio → «Estadísticas: dirección del Worker»."),
          ),
          h("p", { class: "gs-note" }, "La guía completa, con capturas de dónde pulsar, está en tools/LEEME-ESTADISTICAS.md. Mientras tanto puedes ver todo en el panel de Cloudflare → Web Analytics.")));
        return;
      }

      let days = 7, seq = 0;
      const top = h("div", { class: "gs-top", role: "group", "aria-label": "Periodo" });
      const out = h("div", {});
      const buttons = [[1, "Últimas 24 h"], [7, "7 días"], [30, "30 días"], [90, "90 días"]].map(([d, l]) => h("button", { type: "button", "aria-pressed": String(d === days), onclick: () => { days = d; buttons.forEach((b, i) => b.setAttribute("aria-pressed", String([1, 7, 30, 90][i] === days))); load(); } }, l));
      buttons.forEach((b) => top.append(b));
      el.append(top, out);

      const list = (title, rows, label) => {
        const max = Math.max(1, ...(rows || []).map((r) => r.views));
        return card(title, rows && rows.length
          ? h("ul", { class: "gs-list" }, rows.map((r) => h("li", { title: `${label(r)}: ${fmt(r.views)} páginas vistas · ${fmt(r.visits)} visitas` }, h("i", { style: `width:${Math.max(2, (r.views / max) * 100)}%` }), h("span", {}, label(r)), h("em", {}, fmt(r.views)))))
          : h("p", { class: "gs-note" }, "Todavía no hay datos."));
      };

      async function load() {
        const my = ++seq;
        out.replaceChildren(h("p", { class: "ed-empty" }, "Cargando estadísticas…"));
        let d;
        try {
          const r = await fetch(url + "/?days=" + days, { headers: { Authorization: "Bearer " + token() } });
          d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d.error || "Error " + r.status);
        } catch (e) {
          if (my !== seq) return;
          out.replaceChildren(card("No se pudieron cargar las estadísticas", h("p", {}, String(e.message || e)), h("p", { class: "gs-note" }, "Revisa que la dirección del Worker en Ajustes del sitio sea correcta y que el Worker tenga CF_API_TOKEN y CF_ACCOUNT_ID.")));
          return;
        }
        if (my !== seq) return;

        const { out: bs, hourly } = buckets(d.series || [], days);
        const views = (d.series || []).reduce((a, p) => a + p.views, 0), visits = (d.series || []).reduce((a, p) => a + p.visits, 0);
        const max = Math.max(1, ...bs.map((b) => b.visits));
        const label = (b) => (hourly ? `${b.key.slice(11)}:00` : fmtDay(b.key));
        const bar = (b, text) => h("div", { class: "gs-bar" + (b.visits ? "" : " gs-zero"), tabindex: "0", title: text, style: `height:${Math.max(1, (b.visits / max) * 100)}%` });
        const hod = byHourOfDay(d.series || []);
        const hmax = Math.max(1, ...hod.map((b) => b.visits));
        const peak = hod.reduce((a, b) => (b.visits > a.visits ? b : a), hod[0]);

        const err = Object.entries(d.errors || {});
        out.replaceChildren(...[
          h("div", { class: "gs-kpis" },
            h("div", { class: "gs-kpi" }, h("b", {}, fmt(visits)), h("span", {}, "Visitas")),
            h("div", { class: "gs-kpi" }, h("b", {}, fmt(views)), h("span", {}, "Páginas vistas")),
            h("div", { class: "gs-kpi" }, h("b", {}, visits ? (views / visits).toFixed(1).replace(".", ",") : "0"), h("span", {}, "Páginas por visita"))),
          card(hourly ? "Visitas por hora (últimas 24 h)" : "Visitas por día",
            h("div", { class: "gs-bars", role: "img", "aria-label": `Visitas ${hourly ? "por hora" : "por día"}: ${fmt(visits)} en total` }, bs.map((b) => bar(b, `${label(b)} · ${fmt(b.visits)} visitas · ${fmt(b.views)} páginas vistas`))),
            h("div", { class: "gs-axis" }, h("span", {}, label(bs[0])), h("span", {}, label(bs[bs.length - 1]))),
            h("details", {}, h("summary", { class: "gs-note" }, "Ver como tabla"),
              h("table", { class: "gs-table" }, h("thead", {}, h("tr", {}, h("th", {}, hourly ? "Hora" : "Día"), h("th", {}, "Visitas"), h("th", {}, "Páginas vistas"))),
                h("tbody", {}, bs.slice().reverse().map((b) => h("tr", {}, h("td", {}, label(b)), h("td", {}, fmt(b.visits)), h("td", {}, fmt(b.views)))))))),
          card("A qué hora entra la gente (horario de Cuba)",
            h("div", { class: "gs-bars", role: "img", "aria-label": "Visitas por hora del día" }, hod.map((b) => bar({ ...b, visits: b.visits }, `${b.key}:00 · ${fmt(b.visits)} visitas`)).map((n, i) => { n.style.height = `${Math.max(1, (hod[i].visits / hmax) * 100)}%`; return n; })),
            h("div", { class: "gs-axis" }, h("span", {}, "00:00"), h("span", {}, "06:00"), h("span", {}, "12:00"), h("span", {}, "18:00"), h("span", {}, "23:00")),
            h("p", { class: "gs-note" }, peak.visits ? `Hora con más visitas: ${peak.key}:00 (${fmt(peak.visits)}).` : "Todavía no hay visitas en este periodo.")),
          h("div", { class: "gs-grid" },
            list("Países", d.breakdown && d.breakdown.country, (r) => country(r.name)),
            list("Páginas más vistas", d.breakdown && d.breakdown.page, (r) => r.name || "/"),
            list("De dónde llegan", d.breakdown && d.breakdown.referrer, (r) => r.name || "Directo / sin origen"),
            list("Dispositivos", d.breakdown && d.breakdown.device, (r) => DEVICES[r.name] || r.name || "Desconocido"),
            list("Navegadores", d.breakdown && d.breakdown.browser, (r) => r.name || "Desconocido"),
            list("Sistemas operativos", d.breakdown && d.breakdown.os, (r) => r.name || "Desconocido")),
          err.length ? h("p", { class: "gs-note" }, "Algunos datos no se pudieron leer: " + err.map(([k, v]) => `${k} (${v})`).join("; ")) : null,
          h("p", { class: "gs-note" }, "Los datos pueden tardar unos minutos en aparecer. «Visitas» cuenta personas distintas por sesión; «páginas vistas», cada página abierta.")].filter(Boolean));
      }
      load();
    },
  };
})();
