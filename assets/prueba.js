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
      end: "Ver todos los proyectos",
    },
    en: {
      live: "REC · {n} in production", live0: "REC · {n} projects",
      mq1: ["Fiction", "Documentary", "Series", "Music videos", "Havana", "Independent cinema"],
      mq2: ["Small crews", "Big stories", "Made in Cuba", "Plenty of street"],
      cue: "Scroll", plano: "Shot",
      s1: "Projects", s2: "Released", s3: "Years of cinema", s4: "People",
      ring: "GORRIóN · independent cinema · Havana · ", ringFeat: "Featured release · ",
      end: "See all projects",
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
  function numbers() {
    const ys = (typeof HISTORY !== "undefined" ? HISTORY : []).map((h) => +h.y).filter((y) => y > 1900);
    const since = ys.length ? Math.min(...ys) : 2018;
    const crew = new Set(PROJECTS.flatMap((p) => (p.crew || []).map((c) => c.n)));
    return [
      [PROJECTS.length, pt("s1")],
      [PROJECTS.filter((p) => p.status === "estrenado").length, pt("s2")],
      [Math.max(1, new Date().getFullYear() - since), pt("s3")],
      [TEAM.length || crew.size, pt("s4")],
    ];
  }

  /* ---------- La página ---------- */
  function mqRow(words, cls) {
    const set = [...words, ...words].map((w) => `<span>${bw(w)}</span><i>✦</i>`).join("");
    return `<div class="pz-mq__row ${cls}"><div class="pz-mq__t"><span>${set}</span><span>${set}</span></div></div>`;
  }
  function pagePrueba() {
    const feat = PROJECTS.find((p) => p.featured) || PROJECTS[0];
    const sel = PROJECTS.filter((p) => p !== feat).slice(0, 8);
    const inProd = PROJECTS.filter((p) => p.status === "produccion" || p.status === "postproduccion").length;
    const live = inProd ? pt("live").replace("{n}", inProd) : pt("live0").replace("{n}", PROJECTS.length);
    const shots = pickStills(6);
    const sentences = (String(t("about_p")).match(/[^.!?]+[.!?]+/g) || [String(t("about_p"))]).map((x) => x.trim());
    const manifesto = sentences.slice(0, 3).join(" ");
    const HL = /^(peque|grande|small|big|cotidian|everyday|azotea|rooftop)/i;
    const mfw = brandWords(manifesto).map((w) => `<span class="pz-w${HL.test(w.t) ? " hl" : ""}">${w.it ? `<i class="lc">${esc(w.t)}</i>` : esc(w.t).replace(ACC_RE, (c) => `<span class="lc">${c.toLowerCase()}</span>`)}</span>`).join(" ");
    const flock = [0, 1, 2, 3].map((i) => `<span class="pz-fl pz-fl--${i}">${sparrow("fly")}</span>`).join("");

    return `
  <section class="hero sc-dark pz-hero" data-pz="hero">
    <div class="pz-aurora" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="pz-floor" aria-hidden="true"></div>
    <div class="pz-flock" aria-hidden="true">${flock}</div>
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

  <section class="dock sc-bone"><div class="wrap dock__in">
    <a href="${routeHref("proyectos")}"><h3 aria-level="2">${t("nav_proyectos")}</h3>${ICONS.arrow}<p>${t("dock_p")}</p></a>
    <a href="${routeHref("servicios")}"><h3 aria-level="2">${t("nav_servicios")}</h3>${ICONS.arrow}<p>${t("dock_s")}</p></a>
    <a href="${routeHref("contacto")}"><h3 aria-level="2">${t("nav_contacto")}</h3>${ICONS.arrow}<p>${t("dock_c")}</p></a></div></section>

  ${feat ? `<section class="sec sc-dark pz-feat"><div class="wrap feat">
    <div class="pz-feat__p"><a class="feat__poster pz-tilt" href="${routeHref("project", feat.slug)}" aria-label="${esc(feat.title)}"><div class="card__poster" data-title="${esc(feat.title)}">${posterSVG(feat, lang)}</div></a>${ring(pt("ringFeat"), "pz-ring--feat", 200, 2)}</div>
    <div><span class="eyebrow">${t("featured")}</span><h2>${esc(feat.title)}</h2><p class="tagline">${esc(L(feat.tagline))}</p>
      <p class="lede">${esc(L(feat.short))}</p>
      <div class="feat__meta">${statusChip(feat)}<span class="chip">${esc(typeLabel(feat))}</span><span class="chip">${feat.year}</span><span class="chip">${esc(feat.runtime)}</span></div>
      <div class="feat__cta"><a class="btn btn--red pz-mag" href="${routeHref("project", feat.slug)}">${t("see_page")} ${ICONS.arrow}</a>${ext(httpUrl(feat.trailer) || ((feat.where || [])[0] || {}).url || SITE.reelUrl, `${ICONS.play} ${t("trailer")}`, "btn pz-mag")}</div></div>
  </div></section>` : ""}

  <section class="sc-bone pz-hs" data-pz="hs"><div class="pz-hs__stick">
    <div class="wrap"><div class="sec__head"><div><span class="eyebrow">${t("nav_proyectos")}</span><h2>${t("selection")}</h2></div><a class="link-arrow" href="${routeHref("proyectos")}">${t("see_all")} ${ICONS.arrow}</a></div></div>
    <div class="pz-hs__view"><div class="pz-hs__track">${sel.map(card).join("")}<a class="pz-hs__end" href="${routeHref("proyectos")}"><span>${bw(pt("end"))}</span>${ICONS.arrow}</a></div></div>
    <div class="pz-hs__bar" aria-hidden="true"><i></i></div>
  </div></section>

  ${(AWARDS.length || PRESS.length) ? `<section class="sec--tight sc-red"><div class="wrap"><div class="sec__head" style="margin-bottom:20px"><div><span class="eyebrow">${t("press_eyebrow")}</span></div><a class="link-arrow" href="${routeHref("prensa")}">${t("nav_prensa")} ${ICONS.arrow}</a></div></div>
    <div class="laurels">${AWARDS.length ? AWARDS.slice(0, 4).map((a) => `<div class="laurel"><span class="mono">${a.y} · ${esc(a.f)}</span><b>${esc(L(a.a))}</b><span>${esc(projName(a.p))}</span></div>`).join("") : [...PRESS].sort((x, y) => String(y.d).localeCompare(String(x.d))).slice(0, 3).map((x) => `<div class="laurel"><span class="mono">${esc(fmtDate(x.d))} · ${esc(x.s)}</span><b>${esc(L(x.t))}</b></div>`).join("")}</div></section>` : ""}

  ${PARTNERS.length ? partnersHTML() : ""}

  <section class="sc-dark pz-mf" data-pz="mf" aria-labelledby="pz-mf-h">
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
      <div class="pz-stats">${numbers().map(([n, l]) => `<div class="pz-st"><b class="pz-n" data-n="${n}">${n}</b><span>${bw(l)}</span></div>`).join("")}</div>
    </div>
  </section>

  <section class="sec sc-bone"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">${t("nav_noticias")}</span><h2>${t("latest")}</h2></div><a class="link-arrow" href="${routeHref("noticias")}">${t("all_news")} ${ICONS.arrow}</a></div>
    <div class="news news--cols">${sortedNews().slice(0, 3).map(newsItem).join("")}</div></div></section>

  <section class="sec sc-red pz-cta"><div class="wrap cta"><div><h2>${t("cta_h")}</h2><p>${t("cta_p")}</p></div>
    <div class="pz-cta__r">${ring(pt("ring"), "pz-ring--cta", 240)}<a class="btn pz-mag" href="${routeHref("contacto")}">${t("cta_btn")} ${ICONS.arrow}</a></div></div></section>`;
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
    const counters = qa(".pz-n");
    let pinned = false, maxX = 0, header = 64;

    /* Sin animaciones (modo ligero o «reducir movimiento»): todo queda encendido y estático */
    if (!fx) { words.forEach((w) => w.classList.add("on")); layers.forEach((l, i) => { l.style.opacity = i === 0 ? ".32" : "0"; }); return; }
    counters.forEach((c) => { c.textContent = "0"; });
    layers.forEach((l) => { l.style.opacity = "0"; });

    /* La galería anclada cambia la altura de la página: se avisa a los efectos de la web real para que vuelvan a medir las posiciones */
    function resync() { s.synth = true; window.dispatchEvent(new Event("resize")); }
    function measure() {
      const top = document.querySelector(".top"); header = top ? top.getBoundingClientRect().height : 64;
      document.documentElement.style.setProperty("--pz-hh", header + "px");
      if (!hs) return;
      const want = window.innerWidth > 900;
      hs.classList.toggle("pz-pin", want);
      pinned = want;
      if (want) {
        maxX = Math.max(0, track.scrollWidth - view.clientWidth);
        const h = (stick.offsetHeight + maxX) + "px";
        if (hs.style.height !== h) { hs.style.height = h; resync(); }
      } else if (hs.style.height) { hs.style.height = ""; track.style.transform = ""; maxX = 0; resync(); }
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
      }

      if (mf) {
        const r = mf.getBoundingClientRect();
        if (r.bottom > -vh * .2 && r.top < vh * 1.2) {
          const span = Math.max(1, r.height - vh), p = clamp(-r.top / span, 0, 1), n = Math.max(1, layers.length);
          layers.forEach((l, i) => {
            const d = p * n - i - .5, o = clamp(1.25 - Math.abs(d) * 1.5, 0, 1);
            l.style.opacity = (o * .62).toFixed(3);
            l.style.transform = `scale(${(1.1 - clamp(d, -1, 1) * .05).toFixed(3)}) translate3d(0,${(d * -3).toFixed(2)}%,0)`;
          });
          if (mfNo) { const k = clamp(Math.floor(p * n) + 1, 1, n); mfNo.textContent = `${pt("plano")} ${String(k).padStart(2, "0")}/${String(n).padStart(2, "0")}`; }
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

    /* Contadores: suben al entrar en pantalla */
    if ("IntersectionObserver" in window && counters.length) {
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return; io.unobserve(e.target);
        const el = e.target, to = +el.dataset.n || 0, t0 = performance.now(), dur = 1300;
        const tick = (now) => { const k = clamp((now - t0) / dur, 0, 1), eased = 1 - Math.pow(1 - k, 3); el.textContent = String(Math.round(to * eased)); if (k < 1 && st === s) requestAnimationFrame(tick); else el.textContent = String(to); };
        requestAnimationFrame(tick);
      }), { threshold: .6 });
      counters.forEach((c) => io.observe(c));
      off.push(() => io.disconnect());
    }

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
      qa(".dock a, .pz-st").forEach((el) => {
        on_(el, "pointermove", (e) => { const r = el.getBoundingClientRect(); el.style.setProperty("--mx", (e.clientX - r.left).toFixed(0) + "px"); el.style.setProperty("--my", (e.clientY - r.top).toFixed(0) + "px"); });
      });
    }
  }

  window.pagePrueba = pagePrueba;
  window.pruebaInit = pruebaInit;
})();
