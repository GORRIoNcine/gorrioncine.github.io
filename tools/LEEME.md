# Páginas para Google y redes (paso 3)

- `node tools/build-pages.mjs` crea `/proyectos/<nombre>/`, `/noticias/<nombre>/`, las secciones, `404.html`, `sitemap.xml`, `robots.txt` y `site.webmanifest` a partir de `content/*.json`.
- La dirección de la web sale de `content/site.json → siteUrl` (editable en el panel: «Datos generales»). Al activar el dominio nuevo, cámbiala y guarda.
- El flujo `.github/workflows/pages.yml` ejecuta el generador y publica solo en cada cambio. Requiere **Settings → Pages → Source: GitHub Actions** (una vez).
- El código de la web vive en `assets/app.js` y `assets/app.css`; `tools/template.html` es el molde de cada página. No edites a mano los archivos que llevan `<!-- gorrion:generated -->`.
