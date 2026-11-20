---
name: actualizar-bot
description: Actualiza un bot de WhatsApp ya creado con /crear-bot - precios, menú, catálogo, horario, tono o nombre - lo prueba y lo vuelve a publicar en Cloudflare. Usar cuando el usuario escriba /actualizar-bot, o diga "cambiaron los precios", "actualiza el menú", "el bot dice algo viejo", "cambia el horario del bot".
---

# /actualizar-bot — cambiar lo que sabe tu bot

Mismo trato que `/crear-bot`: español neutro de "tú", una pregunta por vez, sin jerga, nunca inventar datos.
`PLUGIN` = `${CLAUDE_PLUGIN_ROOT}`.

1. **¿Dónde está tu bot?** Propón `~/mi-bot-whatsapp`. Verifica que existan `config/negocio.json` y `wrangler.jsonc`;
   si no, ofrece `/crear-bot`.
2. **¿Qué cambió?** Puede pasar un archivo nuevo (lista de precios, menú) o contarlo.
3. Actualiza `config/conocimiento.md` y/o `config/negocio.json`. Con un archivo nuevo, reemplaza **sólo** la sección
   que corresponde y respeta los precios tal cual. Muéstrale el antes y el después de lo que cambió.
4. **Pruébalo en la computadora** antes de publicar: `.dev.vars` tiene que tener `MODO=local`; inicia `npx wrangler dev`
   y que pregunte por lo que cambió (`node PLUGIN/scripts/chat-local.mjs`). Detén `wrangler dev`.
5. Con su OK: `npx wrangler deploy`. Confírmale: "Listo, desde ahora tu bot responde con la información nueva."
