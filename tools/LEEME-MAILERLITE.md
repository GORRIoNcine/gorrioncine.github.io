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
