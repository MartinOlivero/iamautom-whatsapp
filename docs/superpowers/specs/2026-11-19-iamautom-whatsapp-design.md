# iamautom WhatsApp — diseño

Fecha: 19/11/2026 · Autor: Tincho (iamautom / @tincho.olivero) con Claude Code

## 1. Qué es y por qué

Una herramienta **gratis y open source** con la marca iamautom que le permite a **cualquier
persona sin conocimientos técnicos** tener un bot de WhatsApp con IA atendiendo su negocio,
guiada de punta a punta por Claude Code.

**Por qué existe:** se regala para generar autoridad y captar público. Es el "regalo" de una
serie de reels con CTA por comentario (formato del reel de referencia
`instagram.com/reels/Dfoq0XYib6E`). Quien la usa y se traba es un potencial cliente de la
agencia iamautom.

**Referencia:** `github.com/Hainrixz/whatsapp-agentkit` (Enrique Rocha, MIT con aviso de
crédito obligatorio para derivados). Se toma **sólo como ejemplo de ideas**. Ver anti-objetivos.

## 2. Objetivos

1. Un usuario común (dueño de pyme, sin saber programar) termina con un bot respondiendo en
   su WhatsApp real, sin escribir código.
2. **Lo más fácil posible:** cada cuenta externa se conecta con un clic en el navegador
   ("Autorizar"). Copiar una clave a mano es la excepción y, cuando pasa, va guiada paso a paso.
3. **US$ 0 de infraestructura.** El usuario sólo paga lo que consume de IA, y puede probar
   gratis antes de pagar.
4. El bot que se genera es confiable: no responde dos veces, no inventa, verifica que los
   mensajes vengan de WhatsApp de verdad.

## 3. Lo que NO hace (no-objetivos)

- **Primera versión:** no agenda turnos, no toma pedidos, no cobra. Queda para v2.
- No usa n8n (el usuario común no lo tiene).
- No es un servicio alojado por iamautom: cada usuario tiene su bot en su propia cuenta.
- No ofrece panel web de administración en v1.

## 4. Anti-objetivos (sería un fracaso aunque funcione)

- **Copiar texto o código de whatsapp-agentkit.** Todo se escribe desde cero. Si se copia algo,
  hay que darle crédito a Enrique y deja de ser 100 % nuestro.
- Que el bot **invente precios, stock o promesas**: le quema la reputación al negocio y a iamautom.
- Que el usuario tenga que **instalar Python** o pagar un hosting mensual.
- Mandar datos del usuario a iamautom (telemetría, analytics dentro del bot).
- Mostrar precios de los servicios de iamautom (regla de marca: los precios se dicen en la llamada).
- Claves o secretos subidos a GitHub.

## 5. Enfoques considerados

| | Enfoque | Por qué |
|---|---|---|
| A | Igual que el de referencia: bot en Python en Railway | Descartado: obliga a instalar Python y a pagar US$ 5/mes desde el día 1 |
| **B** | **Plugin de Claude Code que genera el bot y lo sube gratis a Cloudflare Workers** | **Elegido por Tincho** |
| — | Vercel | Descartado: los términos dicen *"for your personal or non-commercial use"* en el plan gratis |
| — | n8n | Descartado por Tincho: el usuario común no lo tiene |
| — | Bot alojado por iamautom (SaaS) | Descartado: costos y soporte, deja de ser un regalo |

Verificado: los términos de Cloudflare (actualizados el 12/09/2025) **no prohíben uso comercial
en el plan gratis**. La única restricción propia del plan gratis es no procesar tarjetas de
crédito (2.2.1 h), y el bot no lo hace. Límites del plan gratis: 100.000 pedidos/día, D1 con
5 M lecturas y 100 k escrituras por día, 500 MB por base. `ctx.waitUntil()` permite seguir
trabajando hasta 30 s después de contestar el webhook.

## 6. Decisiones tomadas

### Cómo se distribuye
- **Plugin de Claude Code**, repo público en `github.com/MartinOlivero/` con licencia MIT, con
  su propio marketplace (igual que `faceless-agent`). Se instala con una línea.
- Vive en `~/Documents/Vibe-Code/plugins/iamautom-whatsapp/` (convención de los plugins propios).
- Un comando principal que arranca todo el recorrido (nombre sugerido: `/crear-bot`).

### Las cuentas que necesita el usuario y cómo se conectan
| Cuenta | Para qué | Cómo se conecta |
|---|---|---|
| **OpenRouter** | El "cerebro" (modelo de IA) | **OAuth PKCE con callback a localhost**: el instalador abre `openrouter.ai/auth?...`, el usuario autoriza y la clave vuelve sola (`POST /api/v1/auth/keys`). Se precarga un tope de gasto con el parámetro `limit` (sugerido US$ 5) |
| **Cloudflare** | Donde vive el bot | Login de la herramienta oficial (`wrangler login`), que abre el navegador |
| **Zernio** (único proveedor en v1) | El número de WhatsApp | Zernio **no tiene OAuth para entregar su clave**: es la única clave a copiar (`zernio.com/dashboard/api-keys`), con guía paso a paso. El número se conecta con su flujo oficial (`GET /v1/connect/whatsapp`, Embedded Signup de Meta, escaneando un QR) |

**Por qué sólo Zernio en v1 (decisión de Claude, revisable):** su API cumple todo lo que el bot
necesita (verificado en docs.zernio.com el 19/11/2026): webhook `message.received`, id de evento
estable para deduplicar (`id` / `X-Zernio-Event-Id`), firma HMAC-SHA256 en `X-Zernio-Signature`
(comparar en tiempo constante), respuesta con `POST /v1/inbox/conversations/{id}/messages`,
sandbox gratis (50 mensajes/día, 1 teléfono de prueba). Meta Cloud API directo queda para v2:
duplica el trabajo y es el camino difícil para el usuario común.

### El número: el mismo que ya usa el negocio (coexistencia)
Zernio conecta por defecto en modo **coexistencia**: el negocio **sigue usando la app WhatsApp
Business en su celular** con el mismo número mientras el bot atiende. Requisito: el número tiene
que estar en la app **WhatsApp Business** (no la de WhatsApp común). El recorrido lo verifica y
lo explica antes de conectar.

### Pasar a un humano (sin cuentas extra)
- El bot le dice al cliente que lo pasa con una persona y **deja de responder** en esa conversación.
- El dueño ya recibe la notificación en su app WhatsApp Business (coexistencia): no hace falta
  mail ni plantillas.
- **Si el dueño contesta desde su celular**, Zernio emite `message.sent` con
  `source: whatsapp_business_app` y el bot se pausa solo en esa charla.
- La charla vuelve al bot tras **12 h sin mensajes del dueño** (valor por defecto, configurable).
- Pendiente de verificar en implementación: forma exacta del payload de `message.sent`.

### Costos para el usuario (explicarlos siempre con números reales)
- Probar gratis: modelos gratuitos de OpenRouter, **50 mensajes/día sin cargar crédito**,
  **sólo en el simulador y en el sandbox de Zernio**. Antes de atender clientes reales el
  recorrido exige cargar crédito y pasa a un modelo pago (decisión de Claude: así el bot
  nunca se queda mudo frente a un cliente por cupo agotado).
- Producción: cargar crédito (US$ 10 sube los gratuitos a 1.000/día y habilita modelos mejores).
  OpenRouter cobra 5,5 % al cargar, mínimo US$ 0,80. Monto mínimo de carga: no verificado.
- Modelo por defecto en producción: uno barato y bueno en español
  (referencia: `anthropic/claude-haiku-5.5`, el que usa el bot de perfumes de Tincho).
- WhatsApp: Meta cobra las conversaciones (1.000 respuestas de servicio gratis por mes por número).
  Zernio: 2 cuentas conectadas gratis.

### Qué hace el bot (v1)
1. **Responde con la información del negocio**: datos que da el usuario en la entrevista +
   archivos que carga (PDF, Excel, texto: menú, precios, catálogo, políticas).
2. **Recuerda a cada cliente** (historial por número).
3. **Pasa a un humano** cuando no sabe algo o el cliente lo pide, y deja de responder en esa
   conversación hasta que el dueño la retome.
4. **Nunca inventa** precios, stock ni promesas: si no está en la información cargada, lo dice
   y ofrece el contacto humano.
5. **Entiende audios** (decidido por Tincho, 19/11). Zernio entrega el audio como adjunto
   (`attachments[].type = audio`, `payload.voice = true` para notas de voz) en una URL que pide
   la clave de Zernio; hay que bajarlo **al llegar** (Meta lo borra después). Se manda a un
   modelo de OpenRouter que acepte audio. **A verificar en implementación:** qué modelo lo hace
   bien en español rioplatense, su costo por audio, y que bajar + transcribir + responder entre
   en los 30 s de `waitUntil`. Fotos y stickers: respuesta amable pidiendo que lo escriba (v1).

### Cómo funciona por dentro (lo que tiene que cumplir el bot generado)
- Cloudflare Worker en TypeScript + base D1 (historial, eventos procesados, estado de "pasado a humano").
- Contesta el webhook **de inmediato** y procesa con `ctx.waitUntil()` (los proveedores
  reintentan si tardás).
- **Descarta mensajes duplicados** por id de evento.
- **Verifica la firma** del webhook antes de tocar el mensaje.
- Las claves van como secretos de Cloudflare, nunca en el código ni en el repo.

### El recorrido del usuario (lo que guía Claude Code)
1. Revisa la compu (Node, Claude Code) y explica qué va a pasar y cuánto cuesta.
2. Entrevista, una pregunta por vez: negocio, a qué se dedica, nombre y tono del bot, horario,
   archivos, cómo quiere que le avisen cuando hace falta un humano.
3. Conecta OpenRouter (botón).
4. Genera el bot y **lo prueba en la terminal**: el usuario chatea como si fuera un cliente y
   pide ajustes en lenguaje natural. No se avanza sin su OK.
5. Conecta Cloudflare (botón) y lo publica.
6. Conecta WhatsApp por Zernio (primero el sandbox si quiere probar, después su número real
   en coexistencia) y configura el webhook.
7. Prueba final con el celular del usuario. Explica la ventana de 24 h de WhatsApp.
8. Cierre de marca: "si te trabaste o lo querés más completo, lo armamos nosotros" + link de
   iamautom / comunidad (sin precios).

### Actualizar el bot después (decisión de Claude)
Un segundo comando (nombre sugerido `/actualizar-bot`) para cambiar precios, catálogo, horario
o tono sin rehacer todo: lee la configuración guardada en la carpeta del bot del usuario,
aplica el cambio, lo prueba en el simulador y vuelve a publicar en el mismo Worker. Sin esto,
el bot terminaría dando precios viejos (choca con el anti-objetivo de no inventar).

### Mac y Windows (decisión de Claude)
Muchos dueños de pyme usan Windows. Todo script de apoyo se escribe en **Node puro** (sin bash),
porque Node ya hace falta para la herramienta de Cloudflare. Se prueba en Mac; Windows se
cubre por diseño y queda como riesgo hasta probarlo en una máquina real.

### Marca y tono
- Todo en español. **Llamada de Tincho:** voseo rioplatense, la voz de la marca.
- Branding iamautom (paleta cobre/tinta/verde de iamautom.com, nada de violeta) en el README
  y en cualquier página del repo.
- Si Tincho es aprobado en el programa de afiliados de Zernio, su link va en el README.
  Ojo: Zernio paga 20 % sólo desde la 3.ª cuenta conectada; una pyme con un solo número no genera comisión.

## 7. Lo que queda a criterio de quien lo construya

- Estructura interna del plugin (skills, comandos, scripts de apoyo) y nombre final del comando.
- Cómo se guarda y consulta la información del negocio dentro del Worker (en el prompt, en D1
  o en KV), respetando los límites del plan gratis.
- Cómo se implementa el servidor local efímero para el callback de OpenRouter.
- Modelo gratuito concreto para la etapa de prueba.
- Formato del simulador de chat local.
