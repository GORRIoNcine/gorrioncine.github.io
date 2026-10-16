# Estadísticas dentro del panel (/admin → Estadísticas)

Las visitas ya las cuenta Cloudflare Web Analytics (sin cookies). Para verlas dentro del panel hace falta un
pequeño servicio gratuito en Cloudflare que guarde la clave de forma segura. Se hace una sola vez, unos 10 minutos.

## 1. Crear la clave (token de API)
1. Entra en https://dash.cloudflare.com/profile/api-tokens → **Create Token** → **Create Custom Token**.
2. Nombre: `gorrion-estadisticas`.
3. Permisos: **Account** · **Account Analytics** · **Read**.
4. Recursos de la cuenta: **Include** → tu cuenta.
5. **Continue to summary** → **Create Token**. Copia el token (solo se muestra una vez).

## 2. Crear el Worker
1. En Cloudflare: **Workers & Pages** → **Create** → **Create Worker**. Nombre: `gorrion-stats` → **Deploy**.
2. **Edit code**: borra lo que hay, pega todo el contenido de `tools/stats-worker.js` y pulsa **Deploy**.
3. En la pantalla del Worker: **Settings** → **Variables and Secrets** → **Add**:
   - `CF_API_TOKEN` → tipo **Secret** → pega el token del paso 1.
   - `CF_ACCOUNT_ID` → tipo **Text** → tu ID de cuenta (aparece en la barra lateral derecha de Workers & Pages, o en la dirección del panel de Cloudflare después de `dash.cloudflare.com/`).
   - (Opcional) `SITE_TAG` → solo si tienes varios sitios en Web Analytics, y debe ser el «Site tag» de 32 letras y números, no el nombre de la web. Con un solo sitio, no la crees. Es un código de 32 letras y números, **no** el nombre del sitio. Si tienes un solo sitio, no la crees.
   - (Con dominio propio) `ALLOWED_ORIGINS` → `https://gorrioncine.github.io,https://gorrioncine.eu.org`.
4. **Deploy**. Copia la dirección del Worker (algo como `https://gorrion-stats.TU-USUARIO.workers.dev`).

## 3. Conectarlo al panel
En el panel: **Ajustes del sitio** → «Estadísticas: dirección del Worker de Cloudflare» → pega `https://gorrion-stats.niguelcruzz2.workers.dev/` → **Guardar y publicar**. El panel solo envía la sesión de GitHub a ese origen HTTPS de confianza; otra dirección no será aceptada. Si cambias el dominio del Worker, actualiza también `TRUSTED_STATS_ORIGIN` en `admin/stats.js`.
Espera 1–2 minutos y abre **Estadísticas** en el menú.

## Qué se ve
Visitas, páginas vistas y páginas por visita; visitas por día o por hora; a qué hora entra la gente (horario de Cuba);
países, páginas más vistas, de dónde llegan, dispositivos, navegadores y sistemas operativos.

## Seguridad
- Solo ven las estadísticas las personas que tienen permiso de escritura en el repositorio (la misma sesión de GitHub del panel).
- La dirección del Worker se valida contra un origen HTTPS de confianza antes de enviar la sesión de GitHub.
- El token de Cloudflare vive solo en el Worker. Nunca está en la web ni en el repositorio.

## Si algo falla
- Si abres la dirección del Worker directamente en el navegador solo verás un mensaje de que funciona: es normal. Los datos solo se ven desde el panel.
- «Falta conectar las estadísticas»: falta la dirección del Worker en Ajustes del sitio.
- «Tu cuenta no tiene permiso…»: inicia sesión en el panel con la cuenta de GitHub que edita el sitio.
- «No se encontró la cuenta…»: revisa `CF_ACCOUNT_ID` y que el token tenga el permiso de Account Analytics.
- Sale una sección sin datos con un mensaje técnico al pie: Cloudflare cambió o no reconoce ese dato; el resto sigue funcionando.
- Sin datos: los visitantes con bloqueador de anuncios no se cuentan, y los primeros datos tardan unos minutos.
