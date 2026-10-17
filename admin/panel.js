/* GORRIóN · editor visual del panel (/admin)
   Lee y guarda content/*.json directamente en GitHub con la sesión del usuario.
   Los formularios se generan a partir de schema.json (el mismo esquema que usa el editor avanzado). */
(() => {
  "use strict";
  const G = window.GADMIN;
  const API = "https://api.github.com/repos/" + G.repo;
  const $ = (s, r = document) => r.querySelector(s);
  const h = (tag, a, ...kids) => {
    const e = document.createElement(tag);
    if (a) for (const [k, v] of Object.entries(a)) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (v === true) e.setAttribute(k, "");
      else e.setAttribute(k, v);
    }
    for (const c of kids.flat(3)) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    return e;
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const isBlank = (v) => v == null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.every(isBlank));
  const L = (o) => (o == null ? "" : typeof o === "string" ? o : o.es || o.en || "");
  const slugify = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  const rid = () => { const a = "abcdefghijklmnopqrstuvwxyz234567"; let s = ""; for (let i = 0; i < 10; i++) s += a[Math.floor(Math.random() * 32)]; return s; };
  const today = () => new Date().toISOString().slice(0, 10);
  const toast = (m, k) => G.toast(m, k);
  const ico = (n) => G.ico(n);
  const S = { schema: null, name: null, sec: null, data: null, sha: null, dirty: false, item: null, itemDirty: false, projects: null, blobs: {}, filter: "" };

  /* ---------- GitHub ---------- */
  const hd = () => ({ Authorization: "Bearer " + G.token(), Accept: "application/vnd.github+json" });
  const b64d = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
  const b64e = (s) => { let x = ""; new TextEncoder().encode(s).forEach((c) => (x += String.fromCharCode(c))); return btoa(x); };
  async function ghGet(path) {
    const r = await fetch(`${API}/contents/${path}?ref=main&_=${Date.now()}`, { headers: hd(), cache: "no-store" });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("GitHub " + r.status);
    return r.json();
  }
  async function ghPut(path, b64, sha, message) {
    const body = { message, content: b64, branch: "main" };
    if (sha) body.sha = sha;
    const r = await fetch(`${API}/contents/${path}`, { method: "PUT", headers: { ...hd(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.status === 409 || r.status === 422) throw Object.assign(new Error("conflict"), { conflict: true });
    if (r.status === 401 || r.status === 403) throw Object.assign(new Error("auth"), { auth: true });
    if (!r.ok) throw new Error("GitHub " + r.status);
    return r.json();
  }
  async function loadFile(name) {
    const r = await ghGet(`content/${name}.json`);
    if (!r) throw new Error("No se encontró content/" + name + ".json");
    return { data: JSON.parse(b64d(r.content)), sha: r.sha };
  }

  /* ---------- Imágenes ---------- */
  const imgUrl = (v) => (S.blobs[v] ? S.blobs[v] : /^https?:/.test(v) ? v : "../" + String(v).replace(/^\//, ""));
  async function prepImage(file) {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) throw new Error("Usa una imagen PNG, JPG, WebP o GIF.");
    if (file.type === "image/gif") return { blob: file, ext: "gif" };
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    let blob = await new Promise((r) => c.toBlob(r, "image/webp", 0.82));
    if (blob && blob.type === "image/webp") return { blob, ext: "webp" };
    blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.88));
    return { blob, ext: "jpg" };
  }
  const blobB64 = (blob) => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(",")[1]); f.onerror = rej; f.readAsDataURL(blob); });
  async function uploadImage(file) {
    const { blob, ext } = await prepImage(file);
    const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "imagen";
    const path = `uploads/${Date.now().toString(36)}-${base}.${ext}`;
    await ghPut(path, await blobB64(blob), null, "Sube imagen desde el panel");
    S.blobs["/" + path] = URL.createObjectURL(blob);
    return "/" + path;
  }

  /* ---------- Controles ---------- */
  const isBil = (d) => d.widget === "object" && d.fields && d.fields[0] && d.fields[0].name === "es" && d.fields[1] && d.fields[1].name === "en";
  const LANGS = [["es", "Español"], ["en", "English"]];
  const summaryOf = (def, it, i) => {
    if (typeof it !== "object" || it == null) return String(it || "").slice(0, 80) || `${def.label_singular || "Elemento"} ${i + 1}`;
    if (def.summary) {
      const s = def.summary.replace(/\{\{fields\.(\w+)\}\}/g, (_, k) => {
        const f = (def.fields || []).find((x) => x.name === k), v = it[k];
        if (f && f.picker === "roles") { const r = roleInfo(v); return r ? r.es : v || ""; }
        if (f && f.widget === "select") { const o = (f.options || []).find((x) => x[1] === v); return o ? o[0] : v || ""; }
        return L(v);
      }).replace(/^[\s·:|]+|[\s·:|]+$/g, "").trim();
      if (s) return s;
    }
    return `${def.label_singular || "Elemento"} ${i + 1}`;
  };

  function control(def, get, set, ctx, path) {
    const w = def.widget, touch = () => ctx.touch();
    if (w === "string" || w === "number" || w === "datetime") {
      const inp = h("input", { type: w === "number" ? "number" : w === "datetime" ? "date" : "text", value: get() ?? "", autocomplete: "off" });
      inp.addEventListener("input", () => {
        set(w === "number" ? (inp.value === "" ? undefined : Number(inp.value)) : inp.value); touch();
        if (def.name === "slug") ctx.slugEdited = true;
        if (def.name === "title" && ctx.onTitle) ctx.onTitle(inp.value);
      });
      if (def.name === "slug") ctx.slugInput = { el: inp, set };
      return inp;
    }
    if (w === "text") {
      const ta = h("textarea", { rows: "3" });
      ta.value = get() ?? "";
      const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight + 2, 520) + "px"; };
      ta.addEventListener("input", () => { set(ta.value); grow(); touch(); });
      setTimeout(grow, 0);
      return ta;
    }
    if (w === "boolean") {
      const c = h("input", { type: "checkbox" }); c.checked = !!get();
      c.addEventListener("change", () => { set(c.checked); touch(); });
      return h("label", { class: "ed-sw" }, c, h("span", { class: "ed-sw__t" }));
    }
    if (w === "select" && def.picker === "roles" && S.rl) return rolePicker(get, set, ctx);
    if (w === "select") {
      const s = h("select", {}, h("option", { value: "" }, "— Elige —"), (def.options || []).map(([l, v]) => h("option", { value: v }, l)));
      s.value = get() ?? ""; if (s.value !== (get() ?? "")) s.value = "";
      s.addEventListener("change", () => { set(s.value); touch(); });
      return s;
    }
    if (w === "relation") {
      const opts = (S.projects || []).map((p) => [p.title || p.slug || p.id, p.id]);
      const cur = get();
      if (cur && !opts.some((o) => o[1] === cur)) opts.unshift(["(proyecto eliminado)", cur]);
      const s = h("select", {}, h("option", { value: "" }, "— Ninguno —"), opts.map(([l, v]) => h("option", { value: v }, l)));
      s.value = cur ?? "";
      s.addEventListener("change", () => { set(s.value || undefined); touch(); });
      return s;
    }
    if (w === "image") return imageCtrl(def, get, set, ctx);
    if (w === "object") return isBil(def) ? bilCtrl(def, get, set, ctx, path) : objCtrl(def, get, set, ctx, path);
    if (w === "list") return def.field && !def.fields && def.field.widget === "image" ? galleryCtrl(def, get, set, ctx) : listCtrl(def, get, set, ctx, path);
    return h("em", {}, "(campo no soportado: " + w + ")");
  }

  /* ---------- Cargos de la ficha técnica (más de 500): buscador ---------- */
  const fold = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const syn = (n) => { const f = fold(n); return [/director|dirigir/.test(f) ? "direccion dirigir" : "", /guion/.test(f) ? "guion libreto" : "", /product/.test(f) ? "produccion" : "", /mont|edit/.test(f) ? "montaje edicion" : "", /fotograf/.test(f) ? "fotografia camara" : "", /operador/.test(f) ? "operacion camara" : "", /maquill|peluq/.test(f) ? "caracterizacion" : "", /vfx|efectos/.test(f) ? "efectos especiales" : ""].join(" "); };
  function buildRoles(d) {
    if (!d || !Array.isArray(d.roles)) return null;
    const dn = {}; d.depts.forEach((x) => { dn[x[0]] = x[1]; });
    const di = {}; d.depts.forEach((x, i) => { di[x[0]] = i; });
    const list = d.roles.map((r, o) => ({ k: r[0], es: r[1], d: r[3], dn: dn[r[3]] || r[3], main: r[4] === "p", di: di[r[3]] ?? 99, o, q: fold(r[1] + " " + r[2] + " " + (dn[r[3]] || "") + " " + syn(r[1])) }));
    const by = {}; list.forEach((r) => { by[r.k] = r; });
    return { list, by, legacy: d.legacy || {} };
  }
  const roleInfo = (k) => (S.rl ? S.rl.by[S.rl.legacy[k] || k] : null);
  function rolePicker(get, set, ctx) {
    const R = S.rl;
    const inp = h("input", { type: "text", class: "ed-combo__in", placeholder: "Busca o elige un cargo (director, sonido, maquillaje, dron…)", autocomplete: "off", role: "combobox", "aria-expanded": "false", "aria-autocomplete": "list" });
    const list = h("div", { class: "ed-combo__list", role: "listbox", hidden: true });
    const note = h("small", { class: "ed-hint ed-combo__note" });
    const wrap = h("div", { class: "ed-combo" }, inp, list, note);
    let act = -1, shown = [], pristine = true, closeT = 0;
    const cur = () => roleInfo(get());
    const paintNote = () => {
      const r = cur();
      note.textContent = !r ? "Hay más de 500 puestos: escribe una parte del nombre o del departamento." : r.main ? "Puesto principal · aparece siempre en la ficha, y admite contactos." : "Puesto secundario · aparece en «Ver todo el equipo».";
    };
    const show = () => {
      const q = pristine ? "" : fold(inp.value.trim());
      let items = R.list;
      if (q) { const ws = q.split(/\s+/); items = items.filter((r) => ws.every((w) => r.q.includes(w))); }
      shown = items.slice().sort((a, b) => (b.main - a.main) || a.di - b.di || a.o - b.o);
      list.replaceChildren();
      if (!shown.length) list.append(h("div", { class: "ed-combo__empty" }, "Ningún puesto coincide. Prueba con otra palabra."));
      let lastT = null, lastD = null;
      shown.forEach((r, i) => {
        if (r.main !== lastT) { lastT = r.main; lastD = null; list.append(h("div", { class: "ed-combo__t" }, r.main ? "Principales" : "Secundarios", h("em", {}, r.main ? "aparecen siempre en la ficha" : "aparecen en «Ver todo el equipo»"))); }
        if (r.d !== lastD) { lastD = r.d; list.append(h("div", { class: "ed-combo__g" }, r.dn)); }
        list.append(h("div", { class: "ed-combo__o" + (i === act ? " on" : "") + (cur() && cur().k === r.k ? " sel" : ""), role: "option", "data-i": i, onmousedown: (e) => { e.preventDefault(); pick(r); } }, r.es));
      });
      if (q && shown.length) list.append(h("div", { class: "ed-combo__empty" }, shown.length + " puesto(s) encontrados."));
      list.hidden = false; inp.setAttribute("aria-expanded", "true");
      const sel = list.querySelector(".ed-combo__o.sel"); if (sel && pristine) list.scrollTop = Math.max(0, sel.offsetTop - 80);
    };
    const hide = () => { list.hidden = true; inp.setAttribute("aria-expanded", "false"); act = -1; };
    const pick = (r) => { set(r.k); ctx.touch(); inp.value = r.es; pristine = true; hide(); paintNote(); wrap.dispatchEvent(new CustomEvent("rolechange", { bubbles: true })); };
    inp.addEventListener("focus", () => { clearTimeout(closeT); pristine = true; act = -1; show(); inp.select(); });
    inp.addEventListener("input", () => { pristine = false; act = -1; show(); });
    inp.addEventListener("blur", () => { closeT = setTimeout(() => { hide(); const r = cur(); inp.value = r ? r.es : ""; pristine = true; }, 120); });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (list.hidden) show(); act = Math.max(0, Math.min(shown.length - 1, act + (e.key === "ArrowDown" ? 1 : -1))); list.querySelectorAll(".ed-combo__o").forEach((o) => o.classList.toggle("on", +o.dataset.i === act)); const o = list.querySelector(".ed-combo__o.on"); if (o) o.scrollIntoView({ block: "nearest" }); }
      else if (e.key === "Enter") { e.preventDefault(); const r = shown[act >= 0 ? act : 0]; if (r && !list.hidden) pick(r); }
      else if (e.key === "Escape") { hide(); const r = cur(); inp.value = r ? r.es : ""; pristine = true; }
    });
    const r0 = cur(); inp.value = r0 ? r0.es : (get() || ""); paintNote();
    return wrap;
  }

  function imageCtrl(def, get, set, ctx) {
    const prev = h("div", { class: "ed-img__prev" }), msg = h("span", { class: "ed-img__msg" });
    const file = h("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", hidden: true });
    const up = h("button", { type: "button", class: "ed-btn" }, ico("img"), "Subir imagen");
    const rm = h("button", { type: "button", class: "ed-btn ed-btn--ghost" }, "Quitar");
    const url = h("input", { type: "text", class: "ed-img__url", placeholder: "…o pega el enlace de una imagen", value: /^https?:/.test(get() || "") ? get() : "" });
    const render = () => {
      const v = get();
      prev.replaceChildren(v ? h("img", { src: imgUrl(v), alt: "", onerror: function () { this.replaceWith(h("span", {}, "No se puede mostrar todavía")); } }) : h("span", {}, "Arrastra una imagen aquí"));
      rm.hidden = !v;
    };
    const go = async (f) => {
      if (!f) return;
      up.disabled = true; msg.textContent = "Subiendo…";
      try { const p = await uploadImage(f); set(p); url.value = ""; ctx.touch(); render(); msg.textContent = ""; }
      catch (e) { msg.textContent = ""; toast(e.auth ? "Tu sesión no permite subir imágenes." : e.message || "No se pudo subir la imagen.", "err"); }
      up.disabled = false;
    };
    up.addEventListener("click", () => file.click());
    file.addEventListener("change", () => go(file.files[0]));
    rm.addEventListener("click", () => { set(undefined); url.value = ""; ctx.touch(); render(); });
    url.addEventListener("change", () => { const v = url.value.trim(); if (v) { set(v); ctx.touch(); render(); } });
    ["dragover", "dragenter"].forEach((ev) => prev.addEventListener(ev, (e) => { e.preventDefault(); prev.classList.add("drop"); }));
    ["dragleave", "drop"].forEach((ev) => prev.addEventListener(ev, () => prev.classList.remove("drop")));
    prev.addEventListener("drop", (e) => { e.preventDefault(); go(e.dataTransfer.files[0]); });
    prev.addEventListener("click", () => file.click());
    render();
    return h("div", { class: "ed-img" }, prev, h("div", { class: "ed-img__side" }, h("div", { class: "ed-row" }, up, rm, msg), url, file));
  }

  function galleryCtrl(def, get, set, ctx) {
    const A = () => { let a = get(); if (!Array.isArray(a)) { a = []; set(a); } return a; };
    const wrap = h("div", { class: "ed-gal" }), msg = h("span", { class: "ed-img__msg" });
    const file = h("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", multiple: true, hidden: true });
    const render = () => {
      wrap.replaceChildren();
      A().forEach((v, i) => {
        const mv = (d) => () => { const a = A(), j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; ctx.touch(); render(); };
        wrap.append(h("figure", { class: "ed-gal__i" }, h("img", { src: imgUrl(v), alt: "", loading: "lazy", onerror: function () { this.replaceWith(h("span", {}, "Sin vista previa")); } }),
          h("figcaption", {}, h("button", { type: "button", title: "Mover antes", onclick: mv(-1) }, "‹"), h("button", { type: "button", title: "Mover después", onclick: mv(1) }, "›"), h("button", { type: "button", class: "del", title: "Quitar", onclick: () => { A().splice(i, 1); ctx.touch(); render(); } }, "✕"))));
      });
      wrap.append(h("button", { type: "button", class: "ed-gal__add", onclick: () => file.click() }, ico("plus"), "Añadir fotos"));
    };
    file.addEventListener("change", async () => {
      for (const f of file.files) { msg.textContent = "Subiendo " + f.name + "…"; try { A().push(await uploadImage(f)); ctx.touch(); render(); } catch (e) { toast(e.message || "No se pudo subir " + f.name, "err"); } }
      msg.textContent = ""; file.value = "";
    });
    render();
    return h("div", {}, wrap, msg, file);
  }

  function objCtrl(def, get, set, ctx, path) {
    const ensure = () => { let o = get(); if (!o || typeof o !== "object") { o = {}; set(o); } return o; };
    return h("div", { class: "ed-obj" }, def.fields.map((sub) => fieldEl(sub, () => (get() || {})[sub.name], (v) => { ensure()[sub.name] = v; }, ctx, path + "." + sub.name)));
  }

  function bilCtrl(def, get, set, ctx, path) {
    const ensure = () => { let o = get(); if (!o || typeof o !== "object") { o = {}; set(o); } return o; };
    const otrosDef = def.fields[2];
    const defFor = (code) => (code === "es" ? def.fields[0] : code === "en" ? def.fields[1] : otrosDef && (otrosDef.fields || []).find((f) => f.name === code));
    const getFor = (code) => () => { const o = get() || {}; return code === "es" || code === "en" ? o[code] : (o.otros || {})[code]; };
    const setFor = (code) => (v) => { const o = ensure(); if (code === "es" || code === "en") o[code] = v; else { if (!o.otros) o.otros = {}; o.otros[code] = v; } };
    const bar = h("div", { class: "ed-tabs", role: "tablist" }), body = h("div", { class: "ed-tabbody" });
    const tabs = {};
    const paint = () => { for (const [code, b] of Object.entries(tabs)) b.classList.toggle("has", !isBlank(getFor(code)())); };
    const show = (code) => {
      for (const [c, b] of Object.entries(tabs)) b.setAttribute("aria-selected", String(c === code));
      const d = defFor(code); body.replaceChildren();
      if (!d) return;
      const sub = { ...d, name: def.name, label: def.label };
      const c2 = { ...ctx, touch: () => { ctx.touch(); paint(); }, onTitle: def.name === "title" && code === "es" ? ctx.onTitle : null };
      body.append(control(sub, getFor(code), setFor(code), c2, path + "." + code));
      if (code !== "es" && code !== "en") body.append(h("small", { class: "ed-hint" }, "Opcional. Si lo dejas vacío, esta versión se muestra en inglés."));
    };
    LANGS.forEach(([code, name], i) => {
      if (!defFor(code)) return;
      const b = h("button", { type: "button", role: "tab", class: "ed-tab" + (i > 1 ? " ed-tab--opt" : ""), onclick: () => show(code) }, name);
      tabs[code] = b; bar.append(b);
    });
    paint(); show("es");
    return h("div", { class: "ed-bil" }, bar, body);
  }

  function listCtrl(def, get, set, ctx, path) {
    const prim = !!def.field && !def.fields;
    const A = () => { let a = get(); if (!Array.isArray(a)) { a = []; set(a); } return a; };
    const wrap = h("div", { class: "ed-list" });
    const openIdx = new Set();
    const render = () => {
      wrap.replaceChildren();
      const arr = A();
      arr.forEach((it, i) => {
        const move = (d) => { const a = A(); const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; ctx.touch(); render(); };
        const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
        const tools = h("span", { class: "ed-tools" },
          h("button", { type: "button", title: "Subir", "aria-label": "Subir", onclick: stop(() => move(-1)) }, "↑"),
          h("button", { type: "button", title: "Bajar", "aria-label": "Bajar", onclick: stop(() => move(1)) }, "↓"),
          h("button", { type: "button", class: "del", title: "Quitar", "aria-label": "Quitar", onclick: stop(() => { A().splice(i, 1); ctx.touch(); render(); }) }, "✕"));
        if (prim) {
          const sub = { ...def.field, name: def.name };
          wrap.append(h("div", { class: "ed-prim" }, control(sub, () => A()[i], (v) => { A()[i] = v; }, ctx, path + "[" + i + "]"), tools));
        } else {
          const det = h("details", { class: "ed-li" });
          if (openIdx.has(i) || def.collapsed === false) det.open = true;
          const sum = h("summary", {}, h("span", { class: "ed-li__t" }, summaryOf(def, A()[i], i)), tools);
          det.addEventListener("toggle", () => { det.open ? openIdx.add(i) : openIdx.delete(i); });
          const inner = h("div", { class: "ed-li__b" }, def.fields.map((sub) => fieldEl(sub, () => (A()[i] || {})[sub.name], (v) => { A()[i][sub.name] = v; sum.firstChild.textContent = summaryOf(def, A()[i], i); }, ctx, path + "[" + i + "]." + sub.name)));
          if (def.name === "crew" && S.rl) {
            /* Los contactos solo existen para puestos principales: con un puesto secundario el campo se oculta. */
            const cf = Array.from(inner.children).find((x) => (x.dataset.p || "").endsWith(".c"));
            const sync = () => { const r = roleInfo((A()[i] || {}).r); if (cf) cf.hidden = !!r && !r.main; };
            inner.addEventListener("rolechange", () => { sum.firstChild.textContent = summaryOf(def, A()[i], i); sync(); });
            sync();
          }
          det.append(sum, inner); wrap.append(det);
        }
      });
      wrap.append(h("button", { type: "button", class: "ed-btn ed-add", onclick: () => {
        const a = A();
        if (prim) a.push(""); else { const o = {}; (def.fields || []).forEach((f) => { if (f.default !== undefined) o[f.name] = f.default; }); a.push(o); openIdx.add(a.length - 1); }
        ctx.touch(); render();
        const rows = wrap.querySelectorAll(prim ? ".ed-prim" : ".ed-li"); const el = rows[rows.length - 1]; if (el) { const i = el.querySelector("input,textarea,select"); if (i) i.focus(); }
      } }, ico("plus"), "Añadir " + (def.label_singular || "elemento")));
    };
    render();
    return wrap;
  }

  function fieldEl(def, get, set, ctx, path) {
    if (def.widget === "uuid") return null;
    const big = def.widget === "list" || (def.widget === "object" && !isBil(def));
    const req = def.required !== false && !big && def.widget !== "boolean";
    const wrap = h("div", { class: "ed-f" + (big ? " ed-f--big" : "") + (def.widget === "boolean" ? " ed-f--bool" : ""), "data-p": path });
    const lab = h("div", { class: "ed-fl" }, def.label, req ? h("b", { title: "Obligatorio" }, " *") : "");
    const ctl = control(def, get, set, ctx, path);
    if (def.widget === "boolean") wrap.append(h("div", { class: "ed-boolrow" }, ctl, lab));
    else wrap.append(lab, ctl);
    if (def.hint) wrap.append(h("small", { class: "ed-hint" }, def.hint));
    return wrap;
  }

  /* ---------- Validación ---------- */
  function validate(defs, obj, path, errs) {
    for (const d of defs) {
      if (d.widget === "uuid") continue;
      const p = path + "." + d.name, v = obj ? obj[d.name] : undefined, req = d.required !== false;
      if (d.widget === "object" && d.fields) {
        if (isBil(d)) {
          if (d.fields[0].required !== false && isBlank(v && v.es)) errs.push({ p, msg: `«${d.label}» (Español) es obligatorio.` });
          if (d.fields[1].required !== false && isBlank(v && v.en)) errs.push({ p, msg: `«${d.label}» (English) es obligatorio.` });
        } else validate(d.fields, v || {}, p, errs);
        continue;
      }
      if (d.widget === "list") { if (d.fields && Array.isArray(v)) v.forEach((it, i) => validate(d.fields, it || {}, p + "[" + i + "]", errs)); continue; }
      if (["string", "text", "number", "select", "datetime"].includes(d.widget)) {
        const empty = v === undefined || v === null || v === "" || (typeof v === "number" && Number.isNaN(v));
        if (req && empty) { errs.push({ p, msg: `«${d.label}» es obligatorio.` }); continue; }
        if (!empty && d.pattern && typeof v === "string" && !new RegExp(d.pattern[0]).test(v)) errs.push({ p, msg: `«${d.label}»: ${d.pattern[1]}` });
      }
    }
  }
  function showErrors(errs, scope) {
    scope.querySelectorAll(".bad").forEach((e) => e.classList.remove("bad"));
    scope.querySelectorAll(".ed-err").forEach((e) => e.remove());
    let first = null;
    for (const e of errs) {
      let p = e.p, el = null;
      while (p && !el) { el = scope.querySelector(`[data-p="${CSS.escape(p)}"]`); if (!el) { const n = p.replace(/(\[\d+\]|\.[^.\[]+)$/, ""); p = n === p ? "" : n; } }
      if (el) { el.classList.add("bad"); el.append(h("div", { class: "ed-err" }, e.msg)); first = first || el; }
    }
    if (first) first.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  function normalize(v) {
    if (Array.isArray(v)) return v.map(normalize).filter((x) => !(typeof x === "string" && x.trim() === ""));
    if (v && typeof v === "object") {
      const o = {};
      for (const [k, x] of Object.entries(v)) {
        if (x === undefined) continue;
        o[k] = normalize(x);
      }
      return o;
    }
    return v;
  }

  /* ---------- Guardado ---------- */
  async function persist(msg) {
    const data = normalize(S.data);
    try { S.sha = (await ghPut(`content/${S.name}.json`, b64e(JSON.stringify(data, null, 2) + "\n"), S.sha, msg)).content.sha; }
    catch (e) {
      if (e.conflict) { if (confirm("Alguien más guardó cambios en esta sección mientras editabas.\n\n¿Quieres recargar la versión nueva? (se perderán tus cambios sin guardar)")) { S.item = null; await open(S.name, true); } }
      else toast(e.auth ? "Tu sesión no tiene permiso para guardar. Cierra sesión y entra de nuevo." : "No se pudo guardar. Revisa tu conexión e inténtalo otra vez.", "err");
      throw e;
    }
    S.data = data; S.dirty = false;
    toast("Guardado. La web se actualizará en 1–2 minutos.", "ok");
  }

  /* ---------- Colecciones (tarjetas) ---------- */
  const optLabel = (defs, name, v) => { const f = defs.find((x) => x.name === name); const o = f && (f.options || []).find((x) => x[1] === v); return o ? o[0] : v || ""; };
  const STATUS = { desarrollo: ["En desarrollo", ""], produccion: ["En producción", "warn"], postproduccion: ["En postproducción", "warn"], estrenado: ["Estrenada", "ok"] };
  const COL = {
    proyectos: {
      noun: "proyecto", plural: "Proyectos", add: "Añadir proyecto", ratio: "poster",
      lead: "Películas, series, videoclips y encargos. Haz clic en un proyecto para editarlo.",
      title: (i) => i.title, sub: (i, d) => [optLabel(d, "type", i.type), i.year].filter(Boolean).join(" · "), img: (i) => i.poster,
      chip: (i) => STATUS[i.status], star: (i) => i.featured, sideExtra: ["status", "featured"],
      newItem: () => ({ id: "proj-" + rid(), type: "ficcion", status: "desarrollo", year: new Date().getFullYear(), featured: false, style: "rays" }),
      groups: [["Datos básicos", ["title", "slug", "slugEn", "type", "format", "year", "status", "runtime", "genre", "lang", "subs", "featured"]], ["Cartel y textos", ["poster", "tagline", "short", "long", "note", "noteBy"]], ["Ficha técnica", ["crew"]], ["Recorrido y prensa", ["journey", "press"]], ["Tráiler o teaser", ["trailer", "trailerKind"]], ["Dónde verla (solo para proyectos estrenados)", ["whereHidden", "where"]], ["Apoyar el proyecto (solo en desarrollo)", ["supportOn", "supportUrl", "supportText", "supportGoal"]], ["Fotogramas", ["stills", "style"]], ["Buscadores (opcional)", ["seoTitle", "seoDesc", "noindex"]]],
    },
    noticias: {
      noun: "noticia", plural: "Noticias", add: "Escribir noticia", ratio: "wide",
      lead: "Estrenos, rodajes, convocatorias y detrás de cámaras.",
      title: (i) => L(i.title), sub: (i, d) => [optLabel(d, "cat", i.cat), i.date].filter(Boolean).join(" · "), img: (i) => i.image,
      newItem: () => ({ cat: "estrenos", date: today(), seed: Math.floor(Math.random() * 90) + 1 }),
      groups: [["Datos", ["title", "slug", "slugEn", "cat", "date", "project"]], ["Imagen", ["image"]], ["Texto", ["sum", "body"]], ["Buscadores (opcional)", ["seoTitle", "seoDesc", "noindex"]]],
    },
    equipo: {
      noun: "persona", plural: "Equipo", add: "Añadir persona", ratio: "square",
      lead: "Las personas que aparecen en «Nosotros». El orden de las tarjetas es el orden en la web.",
      title: (i) => i.n, sub: (i) => L(i.r), img: (i) => i.photo, newItem: () => ({}), groups: null,
    },
  };
  const isCollection = (sec) => COL[sec.name] && sec.fields.length === 1 && sec.fields[0].widget === "list" && sec.fields[0].fields;

  const root = () => $("#ed");
  const pageHead = (title, lead, actions) => h("div", { class: "hello" }, h("div", {}, h("h1", {}, title), lead ? h("p", { class: "lead" }, lead) : null), h("div", { class: "ed-actions" }, actions));
  function saveBar(label, onSave, onDiscard, show) {
    return h("div", { class: "ed-savebar", id: "savebar", hidden: !show },
      h("span", { class: "ed-savebar__m" }, ico("warn"), "Hay cambios sin guardar"),
      h("span", { class: "sp" }),
      onDiscard ? h("button", { type: "button", class: "ed-btn ed-btn--ghost", onclick: onDiscard }, "Descartar") : null,
      h("button", { type: "button", class: "ed-btn ed-btn--main", id: "savebtn", onclick: onSave }, ico("ok"), label));
  }
  const setDirty = () => { S.dirty = true; const b = $("#savebar"); if (b) b.hidden = false; };

  function viewGrid() {
    const cfg = COL[S.name], def = S.sec.fields[0], items = S.data.items || [];
    const el = root(); el.replaceChildren();
    let paint;
    const q = h("input", { type: "search", class: "ed-search", placeholder: "Buscar…", value: S.filter, oninput: (e) => { S.filter = e.target.value; paint(); } });
    el.append(pageHead(cfg.plural, cfg.lead, [q, h("button", { class: "ed-btn ed-btn--main", type: "button", onclick: () => openItem(-1) }, ico("plus"), cfg.add)]));
    const grid = h("div", { class: "ed-grid ed-grid--" + cfg.ratio });
    el.append(grid);
    paint = () => {
      grid.replaceChildren();
      const f = S.filter.trim().toLowerCase();
      items.forEach((it, i) => {
        const t = cfg.title(it) || "(sin título)";
        if (f && !(t + " " + cfg.sub(it, def.fields)).toLowerCase().includes(f)) return;
        const im = cfg.img(it), chip = cfg.chip && cfg.chip(it);
        const mv = (d) => (e) => { e.stopPropagation(); const j = i + d; if (j < 0 || j >= items.length) return; [items[i], items[j]] = [items[j], items[i]]; setDirty(); paint(); };
        grid.append(h("article", { class: "ed-card", tabindex: "0", role: "button", "aria-label": "Editar " + t, onclick: () => openItem(i), onkeydown: (e) => { if (e.key === "Enter") openItem(i); } },
          h("div", { class: "ed-card__img" }, im ? h("img", { src: imgUrl(im), alt: "", loading: "lazy", onerror: function () { this.remove(); } }) : null, !im ? h("span", {}, (t || "?").slice(0, 2).toUpperCase()) : null,
            cfg.star && cfg.star(it) ? h("i", { class: "ed-star", title: "Destacado en el inicio" }, "★") : null,
            h("span", { class: "ed-mv" }, h("button", { type: "button", title: "Mover antes", onclick: mv(-1) }, "‹"), h("button", { type: "button", title: "Mover después", onclick: mv(1) }, "›"))),
          h("div", { class: "ed-card__b" }, h("b", {}, t), h("span", {}, cfg.sub(it, def.fields)), chip ? h("em", { class: "chip " + chip[1] }, chip[0]) : null)));
      });
      grid.append(h("button", { type: "button", class: "ed-card ed-card--add", onclick: () => openItem(-1) }, h("span", {}, ico("plus")), h("b", {}, cfg.add)));
    };
    paint();
    el.append(saveBar("Guardar orden y publicar", async () => { try { await persist(`Reordena ${cfg.plural.toLowerCase()} desde el panel`); viewGrid(); } catch (e) { /* aviso ya mostrado */ } }, async () => { await open(S.name, true); }, S.dirty));
  }

  /* ---------- Editor de un elemento ---------- */
  function openItem(idx) {
    const cfg = COL[S.name], def = S.sec.fields[0], isNew = idx < 0;
    const item = isNew ? cfg.newItem() : clone(S.data.items[idx]);
    if (isNew) (def.fields || []).forEach((f) => { if (f.default !== undefined && item[f.name] === undefined) item[f.name] = f.default; });
    S.item = { idx, isNew, item }; S.itemDirty = false;
    const el = root(); el.replaceChildren();
    const ctx = {
      touch: () => {},
      slugEdited: !isNew,
      onTitle: (s) => { if (!ctx.slugEdited && ctx.slugInput) { const v = slugify(s); ctx.slugInput.el.value = v; ctx.slugInput.set(v); } },
    };
    const title = isNew ? "Nuevo: " + cfg.noun : cfg.title(item) || cfg.noun;
    el.append(h("div", { class: "ed-crumb" }, h("a", { href: "#", onclick: (e) => { e.preventDefault(); closeItem(); } }, "← " + cfg.plural), " / ", isNew ? "Nuevo " + cfg.noun : cfg.title(item)));
    el.append(pageHead(title, null, [!isNew ? h("button", { type: "button", class: "ed-btn ed-btn--danger", onclick: () => removeItem(idx) }, "Eliminar") : null]));
    const adv = (f) => /avanzad/i.test(f.label) || f.name === "seed";
    const byName = Object.fromEntries(def.fields.map((f) => [f.name, f]));
    const sideNames = def.fields.filter((f) => f.widget === "image").map((f) => f.name).concat(cfg.sideExtra || []);
    const used = new Set(sideNames);
    const add = (body, f) => { const fe = fieldEl(f, () => item[f.name], (v) => { item[f.name] = v; }, ctx, "$." + f.name); if (fe) body.append(fe); };
    const main = h("div", { class: "ed-main" }), side = h("aside", { class: "ed-side" });
    const stat = h("span", { class: "ed-pub__s" }, isNew ? "Borrador sin publicar" : "Sin cambios");
    ctx.touch = () => { S.itemDirty = true; stat.textContent = "Cambios sin guardar"; stat.classList.add("dirty"); };
    const saveBtn = h("button", { type: "button", class: "ed-btn ed-btn--main ed-pub__b", id: "savebtn", onclick: async () => {
      const errs = []; validate(def.fields, item, "$", errs);
      const sl = item.slug; if (sl && S.data.items.some((o, j) => j !== idx && (o.slug === sl || o.slugEn === sl))) errs.push({ p: "$.slug", msg: "Ya existe otro elemento con esta dirección web." });
      const se = item.slugEn; if (se && S.data.items.some((o, j) => j !== idx && (o.slug === se || o.slugEn === se))) errs.push({ p: "$.slugEn", msg: "Ya existe otro elemento con esta dirección web (en inglés)." });
      if (errs.length) { showErrors(errs, el); toast(`Revisa ${errs.length} campo(s) marcado(s) en rojo.`, "err"); return; }
      saveBtn.disabled = true;
      const prev = clone(S.data);
      if (isNew) S.data.items.push(item); else S.data.items[idx] = item;
      try { await persist(`${isNew ? "Añade" : "Actualiza"} ${cfg.noun} «${cfg.title(item)}» desde el panel`); S.itemDirty = false; S.item = null; viewGrid(); }
      catch (e) { S.data = prev; saveBtn.disabled = false; }
    } }, ico("ok"), isNew ? "Publicar" : "Guardar y publicar");
    side.append(h("section", { class: "ed-card2 ed-pub" }, h("h2", {}, "Publicar"), h("div", { class: "ed-card2__b" }, stat, saveBtn, h("small", { class: "ed-hint" }, "La web se actualiza en 1–2 minutos."), !isNew ? h("button", { type: "button", class: "ed-btn ed-btn--danger", onclick: () => removeItem(idx) }, "Eliminar " + cfg.noun) : null)));
    const sideBody = h("div", { class: "ed-card2__b" });
    sideNames.forEach((k) => { const f = byName[k]; if (f) add(sideBody, f); });
    if (sideBody.children.length) side.append(h("section", { class: "ed-card2" }, h("h2", {}, "Imagen y estado"), sideBody));
    const groups = cfg.groups || [["Datos", def.fields.map((f) => f.name)]];
    groups.forEach(([n, names]) => {
      const body = h("div", { class: "ed-card2__b" });
      names.forEach((k) => { const f = byName[k]; if (!f || adv(f) || sideNames.includes(k)) return; used.add(k); add(body, f); });
      if (body.children.length) main.append(h("section", { class: "ed-card2", "data-grp": n.startsWith("Apoyar") ? "support" : n.startsWith("Dónde") ? "where" : null }, h("h2", {}, n), body));
    });
    const rest = def.fields.filter((f) => !used.has(f.name) && f.widget !== "uuid");
    if (rest.length) {
      const body = h("div", { class: "ed-card2__b" });
      rest.forEach((f) => add(body, f));
      main.append(h("details", { class: "ed-card2 ed-card2--adv" }, h("summary", {}, "Opciones avanzadas"), body));
    }
    const supCard = main.querySelector('[data-grp="support"]'), whCard = main.querySelector('[data-grp="where"]');
    const sync = () => { if (supCard) supCard.hidden = item.status !== "desarrollo"; if (whCard) whCard.hidden = item.status !== "estrenado"; };
    const t0 = ctx.touch; ctx.touch = () => { t0(); sync(); }; sync();
    el.append(h("div", { class: "ed-two" }, main, side));
    window.scrollTo({ top: 0 });
  }
  function closeItem() {
    if (S.itemDirty && !confirm("Tienes cambios sin guardar en este elemento. ¿Salir sin guardar?")) return;
    S.item = null; S.itemDirty = false; viewGrid();
  }
  async function removeItem(idx) {
    const cfg = COL[S.name], it = S.data.items[idx];
    if (!confirm(`¿Eliminar «${cfg.title(it)}»?\n\nSe publicará de inmediato.${S.name === "proyectos" ? "\nLas noticias y premios enlazados a este proyecto quedarán sin proyecto." : ""}`)) return;
    const prev = clone(S.data); S.data.items.splice(idx, 1);
    try { await persist(`Elimina ${cfg.noun} «${cfg.title(it)}» desde el panel`); S.item = null; S.itemDirty = false; viewGrid(); } catch (e) { S.data = prev; }
  }

  /* ---------- Secciones de formulario (ajustes, servicios…) ---------- */
  const SEC_LEAD = {
    seo: "Cómo aparece la web en Google y al compartir enlaces. Los cambios se publican solos en 1–2 minutos.",
    site: "Correo, ciudad, redes y boletín. Se usan en el pie de página y en la página de contacto.",
    servicios: "Lo que ofrece la productora y cómo trabaja.",
    nosotros: "Biografía, valores, historia y aliados de la productora.",
    prensa: "Menciones en prensa y premios o selecciones en festivales.",
  };
  function viewForm() {
    const el = root(); el.replaceChildren();
    const ctx = { touch: setDirty };
    el.append(pageHead(S.sec.label, SEC_LEAD[S.name], []));
    S.sec.fields.forEach((f) => {
      const fe = fieldEl(f, () => S.data[f.name], (v) => { S.data[f.name] = v; }, ctx, "$." + f.name);
      if (fe) el.append(h("section", { class: "ed-card2" }, h("div", { class: "ed-card2__b" }, fe)));
    });
    el.append(saveBar("Guardar y publicar", async () => {
      const errs = []; validate(S.sec.fields, S.data, "$", errs);
      if (errs.length) { showErrors(errs, el); toast(`Revisa ${errs.length} campo(s) marcado(s) en rojo.`, "err"); return; }
      const btn = $("#savebtn"); btn.disabled = true;
      try { await persist(`Actualiza «${S.sec.label}» desde el panel`); viewForm(); } catch (e) { btn.disabled = false; }
    }, async () => { await open(S.name, true); }, false));
  }

  /* ---------- Medios ---------- */
  async function viewMedia() {
    const el = root(); el.replaceChildren();
    const file = h("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", multiple: true, hidden: true });
    const grid = h("div", { class: "ed-grid ed-grid--media" });
    el.append(pageHead("Medios", "Imágenes subidas al sitio. Haz clic en una para copiar su dirección.", [h("button", { type: "button", class: "ed-btn ed-btn--main", onclick: () => file.click() }, ico("img"), "Subir imágenes"), file]), grid);
    const paint = async () => {
      grid.replaceChildren(h("p", { class: "ed-empty" }, "Cargando…"));
      let list = [];
      try { const r = await ghGet("uploads"); list = Array.isArray(r) ? r.filter((x) => x.type === "file" && /\.(png|jpe?g|webp|gif|svg)$/i.test(x.name)) : []; }
      catch (e) { grid.replaceChildren(h("p", { class: "ed-empty" }, "No se pudo leer la carpeta de imágenes.")); return; }
      grid.replaceChildren();
      if (!list.length) grid.append(h("p", { class: "ed-empty" }, "Todavía no hay imágenes subidas. Sube la primera con el botón de arriba."));
      list.reverse().forEach((x) => grid.append(h("button", { type: "button", class: "ed-media", title: "Copiar dirección", onclick: async () => { try { await navigator.clipboard.writeText("/uploads/" + x.name); toast("Dirección copiada: /uploads/" + x.name, "ok"); } catch (e) { toast("/uploads/" + x.name); } } },
        h("img", { src: S.blobs["/uploads/" + x.name] || x.download_url || "../uploads/" + x.name, alt: "", loading: "lazy" }), h("span", {}, x.name))));
    };
    file.addEventListener("change", async () => {
      for (const f of file.files) { try { toast("Subiendo " + f.name + "…"); await uploadImage(f); } catch (e) { toast(e.message || "No se pudo subir " + f.name, "err"); } }
      file.value = ""; paint();
    });
    paint();
  }

  /* ---------- Estadísticas (Cloudflare) ---------- */
  async function viewStats() {
    const el = root();
    el.replaceChildren(h("p", { class: "ed-empty" }, "Cargando…"));
    if (!window.GStats) {
      try { await new Promise((ok, no) => { const sc = document.createElement("script"); sc.src = "stats.js?v=1"; sc.onload = ok; sc.onerror = no; document.head.append(sc); }); }
      catch (e) { el.replaceChildren(h("p", { class: "ed-empty" }, "No se pudo cargar la sección de estadísticas.")); return; }
    }
    window.GStats.render(el, { h, pageHead, ico, token: () => G.token() });
  }

  /* ---------- Entrada ---------- */
  async function open(name, force) {
    const el = root();
    if (!S.schema) S.schema = await fetch("schema.json", { cache: "no-store" }).then((r) => r.json());
    if (!S.rl) { for (const u of ["../content/roles.json", location.pathname.replace(/admin\/.*$/, "") + "content/roles.json"]) { try { S.rl = buildRoles(await fetch(u, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null))); } catch (e) { S.rl = null; } if (S.rl) break; } }
    S.item = null; S.itemDirty = false; S.dirty = false; S.filter = "";
    if (name === "medios") { S.name = "medios"; return viewMedia(); }
    if (name === "estadisticas") { S.name = "estadisticas"; return viewStats(); }
    const sec = S.schema.find((s) => s.name === name);
    if (!sec) { el.replaceChildren(h("p", { class: "ed-empty" }, "Sección desconocida.")); return; }
    el.replaceChildren(h("p", { class: "ed-empty" }, "Cargando " + sec.label.toLowerCase() + "…"));
    try {
      const f = await loadFile(name);
      S.name = name; S.sec = sec; S.data = f.data; S.sha = f.sha;
      if (name === "proyectos") S.projects = S.data.items || [];
      else if (!S.projects || force) { try { S.projects = (await loadFile("proyectos")).data.items || []; } catch (e) { S.projects = []; } }
    } catch (e) { el.replaceChildren(h("p", { class: "ed-empty" }, "No se pudo cargar el contenido: " + (e.message || e))); return; }
    isCollection(sec) ? viewGrid() : viewForm();
  }
  window.addEventListener("beforeunload", (e) => { if (S.dirty || S.itemDirty) { e.preventDefault(); e.returnValue = ""; } });
  window.GEditor = { open, isDirty: () => !!(S.dirty || S.itemDirty), discard: () => { S.dirty = false; S.itemDirty = false; } };
})();
