# Correos de GORRIóN para MailerLite (plan gratuito)

Siete correos con la identidad de la marca (negro, hueso y rojo; titulares condensados; texto tipo máquina de escribir; perforaciones de película), bilingües (ES arriba, EN debajo) para no duplicar automatizaciones por idioma.

- Vista previa de todos: `tools/mailerlite/index.html` (ábrelo en el navegador).
- HTML de cada correo: `tools/mailerlite/correos/*.html`.
- Se regeneran con `node tools/mailerlite/build.mjs` (leen proyectos y noticias de `content/`).

## Qué automatizar (máximo 3 automatizaciones en el plan gratuito)

| Automatización | Pasos | Correos |
|---|---|---|
| 1 · Bienvenida | correo → esperar 3 días → correo | 01 Bienvenida, 02 Conoce el trabajo |
| 2 · Reenganche | esperar 90 días → condición «no abrió nada» → correo | 03 ¿Seguimos en contacto? |
| 3 · Prensa y festivales | al entrar en el grupo → correo | 04 Material de prensa |

Campañas manuales (no cuentan como automatización): 05 Novedades (1 al mes), 06 Estreno, 07 Convocatoria.

## Presupuesto (límites del plan gratuito, verifícalos en tu cuenta)

250 suscriptores activos · 2.500 correos/mes · 3 automatizaciones · 5 pasos por automatización.
Ejemplo con 250 suscriptores: 1 boletín mensual (250) + 1 estreno o convocatoria (250) + bienvenidas (~2 por nuevo suscriptor) ≈ 600–700 correos/mes, muy por debajo de 2.500. El reenganche sirve para dar de baja a quien no abre y no pasar de 250 activos (al superarlos MailerLite deja de enviar).

## Cómo pegarlos
1. Automations → crear → desencadenante «Se une a un grupo» (Boletín, o Prensa y festivales).
2. Añadir paso Email → diseñar con **Custom HTML** → pegar el contenido del archivo.
3. Asunto y preheader: en `tools/mailerlite/correos.json`.
4. Activar «doble confirmación» en el formulario de suscripción (ajuste del formulario, no cuenta como automatización).
5. Las imágenes (carteles) se cargan desde la web publicada: `assets/email/`. Hasta que el sitio se despliegue no se verán.
6. Etiquetas usadas: `{$unsubscribe}` y `{$url}`. MailerLite exige el enlace de baja y que el pie lleve el nombre y ciudad.

## Automatización (se actualizan solos)

**«Conoce el trabajo» (correo 02).** MailerLite no deja editar por API los correos de una automatización, así que sus tres tarjetas son imágenes con dirección fija (`assets/email/auto/card-N-es|en.png`) y enlaces fijos (`/ml/pN/`). Cada vez que se publica la web, `tools/mailerlite/cards.py` las regenera con los proyectos actuales (uno por fase: estrenada, en rodaje, postproducción) y actualiza a dónde apuntan los enlaces. Pegas el correo UNA vez y ya no hay que tocarlo. Límite: el texto vive dentro de la imagen, así que quien tenga las imágenes bloqueadas verá solo «Proyecto destacado 1».

**Boletín «Novedades» (correo 05).** El flujo `.github/workflows/correos-mailerlite.yml` crea el día 1 de cada mes un BORRADOR en MailerLite con las últimas 3 noticias y el mes en curso. No envía nada: lo abres en Campaigns → Drafts, lo revisas y pulsas Send. Si no hay noticias de los últimos 35 días, no crea nada. También se lanza a mano desde GitHub → Actions → «Borrador mensual del boletín» → Run workflow.

Configuración (una vez, en GitHub → Settings → Secrets and variables → Actions):
- Secret `MAILERLITE_API_KEY`: la clave de API (MailerLite → Integrations → API).
- Variable `ML_FROM_EMAIL`: el remitente verificado en MailerLite. Opcionales: `ML_FROM_NAME` (GORRIóN) y `ML_GROUP` (Boletín).

La clave nunca debe ir en el código ni pegarse en chats: si se expone, se revoca y se crea otra.
