/* GORRIóN · Portada experimental (/prueba/)
   Misma estructura y mismo sistema de marca que el inicio real (cabecera, pie, logotipo, paleta, tipografías, reglas de mayúsculas,
   alternancia oscuro / hueso / rojo, perforaciones de película, «escenas»), con una capa de motion graphic de estilo web 3:
   aurora y suelo en perspectiva, bandada de gorriones, cinta de texto que se inclina con el scroll, galería horizontal anclada,
   inclinación 3D con brillo, botones magnéticos, manifiesto que se enciende palabra a palabra sobre fotogramas, contadores y anillo giratorio.
   Se carga solo desde /prueba/ y /en/prueba/ (assets/prueba.js + assets/prueba.css) y reutiliza las funciones de assets/app.js. */
(() => {
  "use strict";

  /* ---------- Textos propios de esta página (el resto sale del diccionario real de la web) ---------- */
  const D = {
    es: {
      live: "REC · {n} en producción", live0: "REC · {n} proyectos",
      mq1: ["Ficción", "Documental", "Series", "Videoclips", "La Habana", "Cine independiente"],
      mq2: ["Equipos pequeños", "Historias grandes", "Hecho en Cuba", "Mucha calle"],
      cue: "Desliza", plano: "Plano",
      s1: "Proyectos", s2: "Estrenados", s3: "Años de cine", s4: "Personas",
      ring: "GORRIóN · cine independiente · La Habana · ", ringFeat: "Estreno destacado · ",
      end: "Ver todos los proyectos", newest: "Nuevo", read: "Leer", talk: "Hablemos",
      st1: "En el catálogo", st2: "Ya en pantalla", st3: "Filmando desde", st4: "Personas en el equipo",
      sd: "Desarrollo", sr: "Producción", sp: "Postproducción", se: "Estrenado",
    },
    en: {
      live: "REC · {n} in production", live0: "REC · {n} projects",
      mq1: ["Fiction", "Documentary", "Series", "Music videos", "Havana", "Independent cinema"],
      mq2: ["Small crews", "Big stories", "Made in Cuba", "Plenty of street"],
      cue: "Scroll", plano: "Shot",
      s1: "Projects", s2: "Released", s3: "Years of cinema", s4: "People",
      ring: "GORRIóN · independent cinema · Havana · ", ringFeat: "Featured release · ",
      end: "See all projects", newest: "New", read: "Read", talk: "Let's talk",
      st1: "In the catalogue", st2: "Already on screen", st3: "Filming since", st4: "People on the crew",
      sd: "Development", sr: "Production", sp: "Post-production", se: "Released",
    },
  };
  const pt = (k) => (D[lang === "en" ? "en" : "es"])[k];

  /* Reglas de marca para textos que no son h1–h4 (brandifyDOM solo revisa los títulos): mayúsculas, acento en minúscula, enlaces en cursiva */
  const bw = (s) => brandWords(String(s)).map((w) => (w.it ? `<i class="lc">${esc(w.t)}</i>` : esc(w.t).replace(ACC_RE, (c) => `<span class="lc">${c.toLowerCase()}</span>`))).join(" ");

  /* ---------- Gorriones (SVG propio: facetas angulares, rojo y hueso como el logotipo) ---------- */
  function wing(cls, fill, ink) {
    const S = [110, 58], u = (a) => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)], P = (l, a) => { const v = u(a); return (S[0] + l * v[0]).toFixed(1) + "," + (S[1] + l * v[1]).toFixed(1); };
    const Ls = [98, 106, 104, 96, 86, 72, 58];
    const fe = Ls.map((l, k) => { const a = -156 + k * 7.5; return `<polygon points="${S.join(",")} ${P(l, a - 2)} ${P(l - 9, a + 9)} ${P(28, a + 18)}" fill="${fill}" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><polygon points="${S.join(",")} ${P(l * .52, a)} ${P(l * .46, a + 8)}" fill="${ink}"/>`; }).join("");
    return `<g class="${cls}">${fe}</g>`;
  }
  function sparrow(mode, cls) {
    const body = `<polygon class="pzs-tail" points="54,66 6,${mode === "perch" ? 98 : 80} 14,${mode === "perch" ? 110 : 92} 60,80" fill="#a31f12" stroke="#efefef" stroke-width="1.4" stroke-linejoin="round"/>
    <polygon points="52,66 96,52 142,56 160,68 134,90 84,92" fill="#efefef" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/>
    <polygon points="84,92 134,90 160,68 146,86 98,100" fill="#a8a8a8"/><polygon points="96,52 142,56 120,66 90,64" fill="#d9d9d9"/>`;
    const head = `<g class="pzs-head"><polygon points="136,54 150,40 168,44 178,56 168,70 148,72" fill="#efefef" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/>
    <polygon points="136,54 150,40 168,44 164,52 148,52" fill="#d4271c" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/>
    <polygon points="156,56 170,53 172,61 158,63" fill="#000"/><circle cx="164" cy="58" r="2" fill="#efefef"/>
    <polygon points="176,56 198,62 176,67" fill="#000" stroke="#efefef" stroke-width="1.6" stroke-linejoin="round"/></g>`;
    if (mode === "perch") return `<svg class="pzs pzs--perch ${cls || ""}" viewBox="0 20 210 120" aria-hidden="true" focusable="false">${body}
    <polygon points="92,56 140,60 124,84 64,98 70,76" fill="#a31f12" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><polygon points="92,56 140,60 134,68 84,66" fill="#000"/>
    <polygon points="76,86 122,80 110,90 70,98" fill="#5f140f"/>${head}
    <g stroke="#efefef" stroke-width="3" stroke-linecap="round" fill="none"><path d="M104 90 L104 112 M104 112 L90 116 M104 112 L98 120 M104 112 L116 118"/><path d="M122 88 L124 112 M124 112 L108 118 M124 112 L130 120 M124 112 L140 116"/></g></svg>`;
    return `<svg class="pzs pzs--fly ${cls || ""}" viewBox="-6 -34 220 170" aria-hidden="true" focusable="false"><g class="pzs-bob">${wing("pzs-w pzs-w--b", "#5f140f", "#000")}${body}${head}
    <g stroke="#efefef" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M100 90 L92 104 M92 104 L84 102 M118 90 L114 106 M114 106 L106 106"/></g>${wing("pzs-w pzs-w--f", "#a31f12", "#000")}</g></svg>`;
  }

  /* Anillo de texto que gira (SVG con textPath) */
  let ringN = 0;
  function ring(text, cls, size = 240, rep = 1) {
    const id = "pz-rp" + ++ringN, c = size / 2, r = c - 24;
    const s = brandWords(text.repeat(rep)).map((w) => w.t).join(" ");
    return `<svg class="pz-ring ${cls || ""}" viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false"><defs><path id="${id}" d="M${c},${c} m-${r},0 a${r},${r} 0 1,1 ${2 * r},0 a${r},${r} 0 1,1 -${2 * r},0"/></defs>
      <text><textPath href="#${id}" textLength="${(2 * Math.PI * r - 4).toFixed(0)}" lengthAdjust="spacing">${esc(s)}</textPath></text><path class="pz-ring__c" d="M${c} ${c - 15} L${c + 5} ${c - 5} L${c + 15} ${c} L${c + 5} ${c + 5} L${c} ${c + 15} L${c - 5} ${c + 5} L${c - 15} ${c} L${c - 5} ${c - 5} Z"/></svg>`;
  }

  /* ---------- Datos derivados ---------- */
  const stillsAll = () => [...new Set(PROJECTS.flatMap((p) => stillImgs(p)))];
  function pickStills(n) {
    const all = stillsAll(); if (all.length <= n) return all;
    return Array.from({ length: n }, (_, i) => all[Math.floor(i * all.length / n)]);
  }
  function stats() {
    const ys = (typeof HISTORY !== "undefined" ? HISTORY : []).map((h) => +h.y).filter((y) => y > 1900);
    const since = ys.length ? Math.min(...ys) : 2018, now = new Date().getFullYear(), years = Math.max(1, now - since);
    const crew = new Set(PROJECTS.flatMap((p) => (p.crew || []).map((c) => c.n)));
    const total = PROJECTS.length, by = (k) => PROJECTS.filter((p) => p.status === k).length;
    const rel = by("estrenado"), people = TEAM.length || crew.size;
    const seg = [["se", "estrenado"], ["sp", "postproduccion"], ["sr", "produccion"], ["sd", "desarrollo"]];
    const bar = `<span class="pz-viz pz-viz--bar" role="img" aria-label="${seg.map(([c, k]) => pt(c) + " " + by(k)).join(", ")}">${seg.map(([c, k], i) => by(k) ? `<i class="s-${c}" style="--w:${(by(k) / Math.max(1, total) * 100).toFixed(1)}%;--d:${i * 90}ms" title="${esc(pt(c))} · ${by(k)}"></i>` : "").join("")}</span>`;
    const pct = Math.round(rel / Math.max(1, total) * 100), C = 2 * Math.PI * 23;
    const ringv = `<span class="pz-viz pz-viz--ring"><svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="23"/><circle class="pz-ring__v" cx="28" cy="28" r="23" style="--C:${C.toFixed(1)};--o:${(C * (1 - pct / 100)).toFixed(1)}"/></svg><em>${pct}%</em></span>`;
    const nt = Math.min(years + 1, 20);
    const ticks = `<span class="pz-viz pz-viz--ticks" aria-hidden="true">${Array.from({ length: nt }, (_, i) => `<i${i === nt - 1 ? ' class="now"' : ""} style="--d:${i * 45}ms"></i>`).join("")}</span><small>${since} → ${now}</small>`;
    const nd = Math.min(people, 24);
    const dots = `<span class="pz-viz pz-viz--dots" aria-hidden="true">${Array.from({ length: nd }, (_, i) => `<i style="--d:${i * 40}ms"></i>`).join("")}</span>`;
    return [
      { n: total, l: pt("s1"), k: pt("st1"), v: bar },
      { n: rel, l: pt("s2"), k: pt("st2"), v: ringv },
      { n: years, l: pt("s3"), k: pt("st3"), v: ticks },
      { n: people, l: pt("s4"), k: pt("st4"), v: dots },
    ];
  }

  /* ---------- La página ---------- */
  function mqRow(words, cls) {
    const set = [...words, ...words].map((w) => `<span>${bw(w)}</span><i>✦</i>`).join("");
    return `<div class="pz-mq__row ${cls}"><div class="pz-mq__t"><span>${set}</span><span>${set}</span></div></div>`;
  }
  function pagePrueba() {
    const feat = PROJECTS.find((p) => p.featured) || PROJECTS[0];
    const gal = PROJECTS.filter((p) => p !== feat).slice(0, 8);
    const inProd = PROJECTS.filter((p) => p.status === "produccion" || p.status === "postproduccion").length;
    const live = inProd ? pt("live").replace("{n}", inProd) : pt("live0").replace("{n}", PROJECTS.length);
    const shots = pickStills(6);
    const sentences = (String(t("about_p")).match(/[^.!?]+[.!?]+/g) || [String(t("about_p"))]).map((x) => x.trim());
    const manifesto = sentences.slice(0, 3).join(" ");
    const HL = /^(peque|grande|small|big|cotidian|everyday|azotea|rooftop)/i;
    const mfw = brandWords(manifesto).map((w) => `<span class="pz-w${HL.test(w.t) ? " hl" : ""}">${w.it ? `<i class="lc">${esc(w.t)}</i>` : esc(w.t).replace(ACC_RE, (c) => `<span class="lc">${c.toLowerCase()}</span>`)}</span>`).join(" ");
    const hist = (typeof HISTORY !== "undefined" ? HISTORY : []).slice().sort((x, y) => String(x.y).localeCompare(String(y.y)));
    const news = sortedNews().slice(0, 4);
    const reasons = ["r_collab", "r_commission", "r_press", "r_dist", "r_other"].map((k) => ({ v: t(k), l: t(k) }));

    return `
  <section class="hero sc-dark pz-hero" data-pz="hero">
    <div class="pz-aurora" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="pz-floor" aria-hidden="true"></div>
    <div class="wrap hero__grid">
      <div class="hero__copy rise"><div class="pz-live" aria-hidden="true"><i></i>${esc(live)}</div><div class="hero__kicker">${t("kicker")}</div><h1 id="page-h">${t("hero_h1")}</h1>
        <p class="hero__sub">${t("hero_sub")}</p>
        <div class="hero__cta"><a class="btn btn--red pz-mag" href="${routeHref("proyectos")}">${t("see_projects")} ${ICONS.arrow}</a><a class="btn pz-mag" href="${routeHref("contacto")}">${t("buddy_b")} ${ICONS.arrow}</a></div></div>
      <div class="hero__art">${heroArt()}</div>
    </div>
    <div class="pz-cue" aria-hidden="true"><span>${esc(pt("cue"))}</span><i></i></div>
    <div class="pz-perch" aria-hidden="true">${sparrow("perch")}</div>
    <div class="sprockets" style="color:var(--red)"></div>
  </section>

  <div class="pz-mq sc-dark" aria-hidden="true" data-pz="mq">${mqRow(pt("mq1"), "pz-mq__row--o")}${mqRow(pt("mq2"), "pz-mq__row--s")}</div>

  ${feat ? `<section class="sec sc-dark pz-feat"><div class="wrap feat">
    <div class="pz-feat__p"><a class="feat__poster pz-tilt" href="${routeHref("project", feat.slug)}" aria-label="${esc(feat.title)}"><div class="card__poster" data-title="${esc(feat.title)}">${posterSVG(feat, lang)}</div></a>${ring(pt("ringFeat"), "pz-ring--feat", 200, 2)}</div>
    <div><span class="eyebrow">${t("featured")}</span><h2>${esc(feat.title)}</h2><p class="tagline">${esc(L(feat.tagline))}</p>
      <p class="lede">${esc(L(feat.short))}</p>
      <div class="feat__meta">${statusChip(feat)}<span class="chip">${esc(typeLabel(feat))}</span><span class="chip">${feat.year}</span><span class="chip">${esc(feat.runtime)}</span></div>
      <div class="feat__cta"><a class="btn btn--red pz-mag" href="${routeHref("project", feat.slug)}">${t("see_page")} ${ICONS.arrow}</a>${ext(httpUrl(feat.trailer) || ((feat.where || [])[0] || {}).url || SITE.reelUrl, `${ICONS.play} ${t("trailer")}`, "btn pz-mag")}</div></div>
  </div></section>` : ""}

  <section class="sc-bone pz-hs" data-pz="hs"><div class="pz-hs__stick">
    <div class="wrap"><div class="sec__head"><div><span class="eyebrow">${t("nav_proyectos")}</span><h2>${t("selection")}</h2></div><a class="link-arrow" href="${routeHref("proyectos")}">${t("see_all")} ${ICONS.arrow}</a></div></div>
    <div class="pz-hs__view"><div class="pz-hs__track">${gal.map(card).join("")}<a class="pz-hs__end" href="${routeHref("proyectos")}"><span>${bw(pt("end"))}</span>${ICONS.arrow}</a></div></div>
    <div class="pz-hs__bar" aria-hidden="true"><i></i></div>
  </div></section>

  ${(AWARDS.length || PRESS.length) ? `<section class="sec--tight sc-red"><div class="wrap"><div class="sec__head" style="margin-bottom:20px"><div><span class="eyebrow">${t("press_eyebrow")}</span></div><a class="link-arrow" href="${routeHref("prensa")}">${t("nav_prensa")} ${ICONS.arrow}</a></div></div>
    <div class="laurels">${AWARDS.length ? AWARDS.slice(0, 4).map((a) => `<div class="laurel"><span class="mono">${a.y} · ${esc(a.f)}</span><b>${esc(L(a.a))}</b><span>${esc(projName(a.p))}</span></div>`).join("") : [...PRESS].sort((x, y) => String(y.d).localeCompare(String(x.d))).slice(0, 3).map((x) => `<div class="laurel"><span class="mono">${esc(fmtDate(x.d))} · ${esc(x.s)}</span><b>${esc(L(x.t))}</b></div>`).join("")}</div></section>` : ""}

  ${PARTNERS.length ? partnersHTML() : ""}

  <section class="sc-dark pz-mf" data-pz="mf" aria-labelledby="pz-mf-h" style="--pz-n:${Math.max(hist.length, 1)}">
    <div class="pz-mf__bg" aria-hidden="true">
      <div class="pz-mf__layers">${shots.map((s, i) => `<img ${imgAttrs(s, "100vw")} alt="" loading="lazy" decoding="async" style="--k:${i}">`).join("")}</div>
      <div class="pz-mf__shade"></div>
      <span class="pz-mf__bird">${sparrow("fly")}</span>
      <div class="pz-mf__tc mono"><span class="pz-mf__rec"><i></i>REC</span><span data-mf-no>${esc(pt("plano"))} 01/${String(Math.max(1, shots.length)).padStart(2, "0")}</span></div>
    </div>
    <div class="wrap pz-mf__in">
      <span class="eyebrow">${t("about_eyebrow")}</span>
      <h2 id="pz-mf-h" class="pz-mf__h">${t("about_h")}</h2>
      <p class="pz-mf__p" data-mf>${mfw}</p>
      <p class="pz-mf__more"><a class="link-arrow" href="${routeHref("nosotros")}">${t("about_btn")} ${ICONS.arrow}</a></p>
      ${hist.length ? `<ol class="pz-shots">${hist.map((h, i) => `<li class="pz-shot pz-rev" data-shot><b aria-hidden="true">${esc(h.y)}</b><div><span class="eyebrow">${esc(pt("plano"))} ${String(i + 1).padStart(2, "0")}</span><h3 aria-level="3">${esc(L(h.t))}</h3><p>${esc(L(h.d))}</p></div></li>`).join("")}</ol>` : ""}
    </div>
  </section>

  <section class="sec--tight sc-red pz-stat-sec" aria-label="${esc(pt("s1"))}"><div class="wrap"><div class="pz-stats">${stats().map((x, i) => `<div class="pz-st pz-rev" style="--i:${i}"><span class="pz-st__k">${String(i + 1).padStart(2, "0")} · ${bw(x.k)}</span><b class="pz-n" data-n="${x.n}" data-g="${x.n}">${x.n}</b><span class="pz-st__l">${bw(x.l)}</span>${x.v}</div>`).join("")}</div></div></section>

  <section class="sec sc-bone pz-news"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">${t("nav_noticias")}</span><h2>${t("latest")}</h2></div><a class="link-arrow" href="${routeHref("noticias")}">${t("all_news")} ${ICONS.arrow}</a></div>
    <div class="pz-nl">${news.map((n, i) => { const pr = n.project ? projBy(n.project) : null; return `<a class="pz-ni pz-rev" style="--i:${i}" href="${routeHref("article", n.slug)}"><span class="pz-ni__bg" aria-hidden="true"></span>
      <span class="pz-ni__no" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
      <span class="pz-ni__m"><span class="mono">${esc(fmtDate(n.date))} · ${esc(L(NEWS_CATS[n.cat]))}</span>${i === 0 ? `<em>${esc(pt("newest"))}</em>` : ""}</span>
      <h3 aria-level="3">${esc(L(n.title))}</h3><p>${esc(L(n.sum))}</p>
      <span class="pz-ni__go" aria-hidden="true">${ICONS.arrow}</span>
      ${pr ? `<span class="pz-ni__pv" aria-hidden="true">${posterSVG(pr, lang)}</span>` : ""}</a>`; }).join("")}</div></div></section>

  <section class="sec sc-red pz-cta"><div class="wrap pz-cta__g">
    <div class="pz-cta__t"><span class="eyebrow">${t("contact_eyebrow")}</span><h2>${t("cta_h")}</h2><p>${t("cta_p")}</p>
      <div class="pz-cta__r">${ring(pt("ring"), "pz-ring--cta", 240)}<a class="link-arrow" href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a></div></div>
    <div class="pz-cta__f"><form class="form" data-form="contact" novalidate>
      ${sel("reason", t("reason"), reasons)}
      <div class="form__row">${fld("c-name", t("name"), { req: true, ac: "name", name: "name" })}${fld("c-email", t("email"), { type: "email", req: true, ac: "email", name: "email" })}</div>
      ${fld("c-msg", t("message"), { type: "textarea", rows: 4, name: "message", req: true })}${hpField()}${tsBox()}
      <p class="err" role="alert"></p><div><button class="btn pz-mag" type="submit">${t("send")} ${ICONS.arrow}</button></div></form><div class="form-out" aria-live="polite"></div></div>
  </div></section>`;
  }

  /* ---------- Comportamiento ---------- */
  let st = null;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function stop() {
    if (!st) return;
    cancelAnimationFrame(st.raf);
    st.off.forEach((f) => { try { f(); } catch (e) { /* nada */ } });
    st = null;
  }
  function pruebaInit(root, on) {
    stop();
    if (!on) return;
    const html = document.documentElement, fx = html.classList.contains("fx");
    const fine = !!(window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches);
    const q = (s) => root.querySelector(s), qa = (s) => Array.from(root.querySelectorAll(s));
    const off = [], s = { off, raf: 0, dirty: true, lastY: window.scrollY, skew: 0 };
    st = s;
    const on_ = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); off.push(() => el.removeEventListener(ev, fn, o)); };

    const hero = q('[data-pz="hero"]'), mq = q('[data-pz="mq"]'), hs = q('[data-pz="hs"]'), mf = q('[data-pz="mf"]');
    const stick = hs && hs.querySelector(".pz-hs__stick"), view = hs && hs.querySelector(".pz-hs__view"), track = hs && hs.querySelector(".pz-hs__track"), bar = hs && hs.querySelector(".pz-hs__bar i");
    const layers = mf ? Array.from(mf.querySelectorAll(".pz-mf__layers img")) : [];
    const words = mf ? Array.from(mf.querySelectorAll(".pz-w")) : [];
    const mfP = mf && mf.querySelector("[data-mf]"), mfBird = mf && mf.querySelector(".pz-mf__bird"), mfNo = mf && mf.querySelector("[data-mf-no]");
    const ctaRing = q(".pz-ring--cta"), featRing = q(".pz-ring--feat");
    const cards = qa(".pz-hs .card__poster"), shotEls = qa("[data-shot]"), topBar = q(".pz-top");
    let pinned = false, maxX = 0, header = 76, lastTopY = window.scrollY;

    /* Sin animaciones (modo ligero o «reducir movimiento»): todo queda encendido y estático */
    if (!fx) { words.forEach((w) => w.classList.add("on")); layers.forEach((l, i) => { l.style.opacity = i === 0 ? ".32" : "0"; }); return; }
    layers.forEach((l) => { l.style.opacity = "0"; });

    /* La galería anclada cambia la altura de la página: se avisa a los efectos de la web real para que vuelvan a medir las posiciones */
    function resync() { s.synth = true; window.dispatchEvent(new Event("resize")); }
    function measure() {
      header = 78;
      document.documentElement.style.setProperty("--pz-hh", header + "px");
      if (!hs) return;
      const want = window.innerWidth > 900;
      hs.classList.toggle("pz-pin", want);
      pinned = want;
      if (want) {
        maxX = Math.max(0, track.scrollWidth - view.clientWidth);
        const h = (stick.offsetHeight + maxX) + "px";
        if (hs.style.height !== h) { hs.style.height = h; resync(); }
      } else { if (hs.style.height) { hs.style.height = ""; track.style.transform = ""; maxX = 0; resync(); } cards.forEach((c) => c.style.setProperty("--cr", "0deg")); }
    }

    function frame() {
      s.raf = 0;
      const y = window.scrollY, vh = window.innerHeight;
      const v = y - s.lastY; s.lastY = y;
      s.skew += (clamp(v * .22, -9, 9) - s.skew) * .18;
      if (mq) mq.style.setProperty("--sk", s.skew.toFixed(2) + "deg");

      if (hero && y < vh * 1.4) { hero.style.setProperty("--ay", (y * .22).toFixed(1) + "px"); hero.style.setProperty("--fy", (y * .08).toFixed(1) + "px"); }

      if (hs && pinned) {
        const r = hs.getBoundingClientRect(), d = Math.max(1, r.height - stick.offsetHeight);
        const p = clamp((header - r.top) / d, 0, 1);
        track.style.transform = `translate3d(${(-p * maxX).toFixed(1)}px,0,0)`;
        if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
        const vw = window.innerWidth;
        cards.forEach((c) => {
          const r = c.parentElement.getBoundingClientRect(), d = clamp(((r.left + r.width / 2) - vw / 2) / (vw / 2), -1.3, 1.3);
          c.style.setProperty("--cr", (d * -26).toFixed(1) + "deg"); c.style.setProperty("--cz", (-Math.abs(d) * 90).toFixed(0) + "px");
        });
      }

      if (topBar && !html.classList.contains("nav-lock")) {
        const dy = y - lastTopY;
        if (Math.abs(dy) > 5) { topBar.classList.toggle("is-hidden", dy > 0 && y > 220); lastTopY = y; }
        topBar.classList.toggle("is-solid", y > 40);
      }

      if (mf) {
        const r = mf.getBoundingClientRect();
        if (r.bottom > -vh * .2 && r.top < vh * 1.2) {
          const span = Math.max(1, r.height - vh), p = clamp(-r.top / span, 0, 1), n = Math.max(1, layers.length);
          /* La foto de fondo sigue al «plano» que está en el centro de la pantalla (cada hito de la historia tiene su fotograma) */
          let g = p * (n - 1);
          if (shotEls.length > 1) {
            const c = shotEls.map((e) => { const b = e.getBoundingClientRect(); return b.top + b.height / 2; }), mid = vh / 2;
            let f = 0;
            if (mid >= c[c.length - 1]) f = c.length - 1;
            else if (mid > c[0]) { let i = 0; while (i < c.length - 2 && mid > c[i + 1]) i++; f = i + (mid - c[i]) / (c[i + 1] - c[i]); }
            g = f * (n - 1) / (shotEls.length - 1);
          }
          layers.forEach((l, i) => {
            const d = g - i, o = clamp(1.25 - Math.abs(d) * 1.4, 0, 1);
            l.style.opacity = (o * .62).toFixed(3);
            l.style.transform = `scale(${(1.1 - clamp(d, -1, 1) * .06).toFixed(3)}) translate3d(0,${(d * -4).toFixed(2)}%,0)`;
          });
          if (mfNo) { const k = clamp(Math.round(g) + 1, 1, n); mfNo.textContent = `${pt("plano")} ${String(k).padStart(2, "0")}/${String(n).padStart(2, "0")}`; }
          if (mfBird) {
            const bx = -18 + p * 140, by = 24 + Math.sin(p * 11) * 7 + p * 18;
            mfBird.style.transform = `translate3d(${bx}vw,${by}vh,0) rotate(${(Math.cos(p * 11) * 5).toFixed(1)}deg)`;
          }
          if (mfP) {
            const pr = mfP.getBoundingClientRect();
            const lit = clamp((vh * .82 - pr.top) / (pr.height + vh * .3), 0, 1) * words.length;
            for (let i = 0; i < words.length; i++) words[i].classList.toggle("on", i < lit);
          }
        }
      }

      if (ctaRing || featRing) {
        const rot = (y * .12) % 360;
        if (ctaRing) ctaRing.style.setProperty("--rot", rot.toFixed(1) + "deg");
        if (featRing) featRing.style.setProperty("--rot", (-rot).toFixed(1) + "deg");
      }
      if (Math.abs(s.skew) > .05) kick();
    }
    function kick() { if (!s.raf) s.raf = requestAnimationFrame(frame); }
    on_(window, "scroll", kick, { passive: true });
    on_(window, "resize", () => { if (s.synth) { s.synth = false; return; } measure(); kick(); }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (st === s) { measure(); kick(); } });
    on_(window, "load", () => { measure(); kick(); });
    measure(); kick();
    setTimeout(() => { if (st === s) { measure(); kick(); } }, 600);

    /* Entradas: aparición escalonada y estadísticas (contadores + gráficos) al entrar en pantalla */
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        const el = e.target;
        if (!e.isIntersecting) return;
        el.classList.add("in");
        const num = el.querySelector(".pz-n");
        if (num && !num.dataset.done) {
          num.dataset.done = "1";
          const to = +num.dataset.n || 0, t0 = performance.now(), dur = 1400;
          const tick = (now) => { const k = clamp((now - t0) / dur, 0, 1), eased = 1 - Math.pow(1 - k, 3); num.textContent = String(Math.round(to * eased)); if (k < 1 && st === s) requestAnimationFrame(tick); else num.textContent = String(to); };
          num.textContent = "0"; requestAnimationFrame(tick);
        }
        io.unobserve(el);
      }), { threshold: .25, rootMargin: "0px 0px -6% 0px" });
      qa(".pz-rev").forEach((el) => io.observe(el));
      off.push(() => io.disconnect());
    } else qa(".pz-rev").forEach((el) => el.classList.add("in"));

    /* Cabecera: el indicador rojo sigue al enlace sobre el que pasas */
    const nav = q(".pz-top .nav"), ind = nav && nav.querySelector(".pz-top__ind");
    if (nav && ind) {
      const to = (a) => { if (!a) { ind.style.opacity = "0"; return; } ind.style.setProperty("--ix", a.offsetLeft + "px"); ind.style.setProperty("--iw", a.offsetWidth + "px"); ind.style.opacity = "1"; };
      nav.querySelectorAll("a").forEach((a) => { on_(a, "pointerenter", () => to(a)); on_(a, "focus", () => to(a)); });
      on_(nav, "pointerleave", () => to(nav.querySelector('a[aria-current="page"]')));
    }

    /* Noticias: la portada del proyecto sigue al puntero dentro de la fila */
    if (fine) qa(".pz-ni").forEach((el) => {
      on_(el, "pointermove", (e) => { const r = el.getBoundingClientRect(); el.style.setProperty("--px", (e.clientX - r.left).toFixed(0) + "px"); el.style.setProperty("--py", (e.clientY - r.top).toFixed(0) + "px"); });
    });

    /* Puntero (solo ratón): foco de luz en el hero, inclinación 3D con brillo, botones magnéticos, foco en el dock */
    if (fine) {
      if (hero) {
        const art = hero.querySelector(".hero__art");
        on_(hero, "pointermove", (e) => {
          const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          hero.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); hero.style.setProperty("--my", (y * 100).toFixed(1) + "%");
          if (art) { art.style.setProperty("--tx", ((x - .5) * 7).toFixed(2) + "deg"); art.style.setProperty("--ty", ((.5 - y) * 5).toFixed(2) + "deg"); }
        });
        on_(hero, "pointerleave", () => { if (art) { art.style.setProperty("--tx", "0deg"); art.style.setProperty("--ty", "0deg"); } });
      }
      qa(".pz-tilt, .pz-hs .card__poster").forEach((el) => {
        el.classList.add("pz-tiltable");
        on_(el, "pointermove", (e) => {
          const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          el.style.setProperty("--ry", ((x - .5) * 14).toFixed(2) + "deg"); el.style.setProperty("--rx", ((.5 - y) * 14).toFixed(2) + "deg");
          el.style.setProperty("--gx", (x * 100).toFixed(0) + "%"); el.style.setProperty("--gy", (y * 100).toFixed(0) + "%");
        });
        on_(el, "pointerleave", () => { el.style.setProperty("--ry", "0deg"); el.style.setProperty("--rx", "0deg"); });
      });
      qa(".pz-mag").forEach((el) => {
        on_(el, "pointermove", (e) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty("--mgx", ((e.clientX - (r.left + r.width / 2)) * .22).toFixed(1) + "px");
          el.style.setProperty("--mgy", ((e.clientY - (r.top + r.height / 2)) * .32).toFixed(1) + "px");
        });
        on_(el, "pointerleave", () => { el.style.setProperty("--mgx", "0px"); el.style.setProperty("--mgy", "0px"); });
      });
      qa(".pz-st").forEach((el) => {
        on_(el, "pointermove", (e) => { const r = el.getBoundingClientRect(); el.style.setProperty("--mx", (e.clientX - r.left).toFixed(0) + "px"); el.style.setProperty("--my", (e.clientY - r.top).toFixed(0) + "px"); });
      });
    }
  }

  /* Cabecera de esta página: la misma de la web real (mismos botones y menú) con un envoltorio flotante, indicador deslizante y botón de contacto */
  function pruebaHeader(h) {
    return h.replace('<header class="top sc-dark">', '<header class="top sc-dark pz-top">')
      .replace("</nav>", '<i class="pz-top__ind" aria-hidden="true"></i></nav>')
      .replace('<button class="tbtn burger"', `<a class="pz-top__cta" href="${routeHref("contacto")}"><span>${esc(pt("talk"))}</span>${ICONS.arrow}</a><button class="tbtn burger"`);
  }
  window.pruebaHeader = pruebaHeader;
  window.pagePrueba = pagePrueba;
  window.pruebaInit = pruebaInit;
})();
