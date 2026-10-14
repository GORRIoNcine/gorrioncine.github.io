# Páginas para Google y redes (paso 3)

- `node tools/build-pages.mjs` crea `/proyectos/<nombre>/`, `/noticias/<nombre>/`, las secciones, `404.html`, `sitemap.xml`, `robots.txt` y `site.webmanifest` a partir de `content/*.json`.
- La dirección de la web sale de `content/site.json → siteUrl` (editable en el panel: «Datos generales»). Al activar el dominio nuevo, cámbiala y guarda.
- El flujo `.github/workflows/pages.yml` ejecuta el generador y publica solo en cada cambio. Requiere **Settings → Pages → Source: GitHub Actions** (una vez).
- El código de la web vive en `assets/app.js` y `assets/app.css`; `tools/template.html` es el molde de cada página. No edites a mano los archivos que llevan `<!-- gorrion:generated -->`.

## Imágenes
- Al subir una imagen desde el panel se convierte a WebP (máx. 1600 px) en tu navegador.
- En cada publicación, `tools/optimize-images.py` convierte a WebP lo que se haya subido por otra vía (GitHub, editor avanzado), quita datos ocultos (GPS, cámara), recomprime las muy pesadas y genera versiones pequeñas (`uploads/w480|w800|w1200`, solo en la web publicada) que usa el móvil.
- Las imágenes ya subidas no se pierden: si una versión pequeña falta, la web usa la original.
