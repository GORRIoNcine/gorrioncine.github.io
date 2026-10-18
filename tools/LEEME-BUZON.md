# Buzón de mensajes (formularios → panel → correo)

Cuando alguien usa un formulario de la web (contacto, presupuesto, solicitud de material), un **Worker de Cloudflare**
lo recibe, comprueba que no es spam, lo **guarda** y te **avisa por correo**. Los mensajes se leen en el panel,
en **Mensajes** (con un contador de «sin leer» en el menú). Todo es gratuito. Se hace una sola vez, unos 20 minutos.

```
Formulario de la web ──► Worker «gorrion-buzon» ──► base de datos D1 ──► panel /admin → Mensajes
        (Turnstile)                └──► aviso por correo a ti
```

## 1. Crear la base de datos (D1)
1. Cloudflare → **Storage & Databases** → **D1 SQL Database** → **Create database**. Nombre: `gorrion-buzon`.
2. No hace falta crear tablas: el Worker las crea solo la primera vez.

## 2. Crear el antispam (Turnstile)
1. Cloudflare → **Turnstile** → **Add widget**. Nombre: `gorrion-formularios`.
2. **Hostname**: añade `gorrioncine.github.io` (y `gorrioncine.eu.org` cuando lo tengas).
3. **Widget Mode**: *Managed*. Crea el widget y copia dos claves:
   - **Site key** (pública, empieza por `0x`) → va en el panel (paso 5).
   - **Secret key** (secreta) → va en el Worker (paso 3).

## 3. Crear el Worker
1. **Workers & Pages** → **Create** → **Create Worker**. Nombre: `gorrion-buzon` → **Deploy**.
   (Con ese nombre y tu cuenta, la dirección será `https://gorrion-buzon.niguelcruzz2.workers.dev`, que es la que el panel acepta de confianza.)
2. **Edit code**: borra lo que hay, pega todo `tools/inbox-worker.js` y pulsa **Deploy**.
3. **Settings → Bindings → Add → D1 database**: en «Variable name» escribe exactamente `DB` y elige la base `gorrion-buzon` (la nueva versión del Worker acepta otros nombres, pero `DB` es lo recomendado).
4. **Settings → Variables and Secrets → Add**:
   - `TURNSTILE_SECRET` → **Secret** → la Secret key del paso 2.
   - `NOTIFY_TO` → **Text** → el correo donde quieres recibir los avisos.
   - `NOTIFY_FROM` → **Text** → remitente (ver paso 4).
   - (Con dominio propio) `ALLOWED_ORIGINS` → `https://gorrioncine.github.io,https://gorrioncine.eu.org`.

## 4. Elegir cómo se envía el aviso por correo
**Opción A · Resend (la más rápida, no necesita dominio).**
1. Crea una cuenta gratuita en resend.com → **API Keys** → crea una clave.
2. En el Worker: `RESEND_API_KEY` (**Secret**) con esa clave.
3. `NOTIFY_FROM` = `GORRIóN <onboarding@resend.dev>`.
4. Mientras no verifiques un dominio en Resend, **solo puede enviar al correo con el que te registraste**: usa ese mismo correo en `NOTIFY_TO`.

**Opción B · Cloudflare Email Routing (cuando tengas el dominio en Cloudflare).**
1. En el dominio: **Email → Email Routing** → actívalo y añade y **verifica** tu correo como destino.
2. En el Worker: **Settings → Bindings → Add → Send Email** → nombre `MAIL` → *Allowed destination addresses*: tu correo.
3. `NOTIFY_FROM` = una dirección de ese dominio, p. ej. `buzon@gorrioncine.eu.org`; `NOTIFY_TO` = tu correo verificado.

Si no configuras ninguna de las dos, los mensajes se guardan igual y los ves en el panel; solo falta el aviso.
Cada aviso lleva *Responder a* = el correo de quien escribió: responde directamente al aviso.

## 5. Conectarlo a la web
En el panel: **Ajustes del sitio**
- «Buzón de mensajes: dirección del Worker de Cloudflare» → `https://gorrion-buzon.niguelcruzz2.workers.dev`
- «Turnstile (antispam): clave del sitio» → la **Site key**.

**Guardar y publicar.** En 1–2 minutos los formularios ya envían al buzón. Prueba enviando uno y míralo en **Mensajes**.
Si cambias el nombre o la cuenta del Worker, actualiza también `INBOX_TRUSTED` en `admin/index.html`.

## Cómo se protege del spam
- **Turnstile** (Cloudflare): verificación sin acertijos; solo se carga cuando alguien empieza a escribir en un formulario.
- **Campo trampa** invisible: los robots que lo rellenan se descartan sin avisar.
- **Límite**: máximo 5 mensajes cada 10 minutos por persona (se guarda solo una huella irreconocible de la IP, no la IP).
- Validación de correo, longitudes y origen (solo tu web puede enviar).
- Lo marcado como **Es spam** queda en su pestaña y no cuenta como sin leer.

## Quién ve los mensajes
Solo quien tiene permiso de escritura en el repositorio (la misma sesión de GitHub del panel). El Worker lo comprueba en cada petición.
Los mensajes **no** están en el repositorio: viven en la base de datos D1 de tu cuenta de Cloudflare.

## Si algo falla
- **El formulario sigue preparando un correo en vez de enviar**: falta la dirección del Worker o la clave del sitio en Ajustes, o el Worker no responde. Abre la dirección del Worker en el navegador: debe decir «Buzón de GORRIóN: funcionando».
- **«Confirma que no eres un robot»**: la clave del sitio y la secreta no son del mismo widget, o falta tu dominio en los *Hostnames* de Turnstile.
- **En Mensajes: «Falta conectar el buzón»**: la dirección en Ajustes no es la de confianza (revisa `INBOX_TRUSTED`).
- **«Falta conectar la base de datos»**: añade el binding `DB` (paso 3.3).
- **Llegan mensajes pero no avisos**: revisa `NOTIFY_TO`, `NOTIFY_FROM` y el paso 4; mira Worker → **Logs**.
- **El boletín** usa MailerLite y no pasa por este buzón.

## Privacidad
Los formularios guardan nombre, correo, organización y mensaje. Conviene decirlo en el Aviso legal y borrar los mensajes
que ya no necesites (botón **Eliminar** en el panel).
