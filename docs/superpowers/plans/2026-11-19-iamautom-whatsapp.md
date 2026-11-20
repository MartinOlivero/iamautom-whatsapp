# iamautom WhatsApp — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plugin gratis de Claude Code que entrevista al dueño de una pyme, configura un bot de WhatsApp con IA ya probado y lo publica gratis en Cloudflare, conectado por Zernio y OpenRouter.

**Architecture:** A diferencia del repo de referencia (que hace que Claude *escriba* el bot cada vez), acá el bot es una **plantilla de Worker ya escrita y testeada** (`plantilla/`). Claude Code sólo copia la plantilla a la carpeta del usuario, genera su configuración (`negocio.json` + `conocimiento.md`) y corre los scripts de conexión. Analogía: entregamos el mueble armado y sólo le ponemos las fotos del dueño; no le damos el manual para que lo arme cada vez. Más confiable y más fácil de mantener.

**Tech Stack:** Cloudflare Workers (TypeScript) + D1 · `vitest` + `@cloudflare/vitest-pool-workers` · OpenRouter (chat completions) · Zernio API v1 · scripts en Node puro (`.mjs`, sin dependencias) · skills de Claude Code.

**Spec:** `docs/superpowers/specs/2026-11-19-iamautom-whatsapp-design.md`

## Global Constraints

- **Escrito de cero.** Prohibido copiar texto o código de `Hainrixz/whatsapp-agentkit` (exige crédito en derivados). No abrir ese repo mientras se implementa.
- Todo texto para el usuario y el cliente final: **español con voseo rioplatense**.
- Ningún secreto en el repo: claves sólo en `.dev.vars` (en `.gitignore`) y en secretos de Cloudflare.
- Scripts de apoyo en **Node puro** (`.mjs`, sin `npm install`), deben andar en macOS y Windows (nada de bash).
- Zernio es el **único** proveedor en v1. Firma: HMAC-SHA256 hex en minúsculas del body crudo, header `X-Zernio-Signature`, comparación en tiempo constante. Dedup por `id` / `X-Zernio-Event-Id`.
- Contestar el webhook **antes de 5 s**; el trabajo va en `ctx.waitUntil()` (máx. 30 s).
- Charla pausada (dueño contestó o el bot la pasó a humano): vuelve al bot tras **12 h** sin mensajes del dueño (`HORAS_PAUSA`, default `12`).
- OpenRouter: tope de gasto precargado **US$ 5** (`limit=5`). Modelo gratuito sólo para simulador y sandbox; con clientes reales, modelo pago (default texto `anthropic/claude-haiku-5.5`).
- Nunca mostrar precios de los servicios de iamautom. Sin telemetría.
- Licencia MIT, autor "Martín Olivero / IamAutom", estructura de plugin igual a `faceless-agent` (`.claude-plugin/plugin.json` + `marketplace.json`, `skills/<nombre>/SKILL.md`).

## Review Focus

1. **Zernio reintenta el mismo evento mientras el primero todavía se procesa** → el cliente recibe UNA sola respuesta (el dedup se marca *antes* de procesar, con índice único). Test en Task 6.
2. **OpenRouter falla o no hay crédito (402/5xx/timeout)** → el cliente no queda en silencio: recibe "En un ratito te responde una persona del equipo." y la charla se pausa. Test en Task 6.
3. **El audio ya no se puede bajar (400) o el modelo no lo entiende** → el bot pide que lo escriba, no se queda mudo. Test en Task 6.
4. **Falta `ZERNIO_WEBHOOK_SECRET` en producción** → se rechaza todo con 401 (falla cerrado); sólo `MODO=local` acepta sin firma. Test en Task 2.
5. **Preguntan un precio que no está en `conocimiento.md`** → el bot dice que no lo tiene y ofrece una persona; nunca inventa. Test del prompt en Task 5 y prueba real en Task 9.

---

### Task 1: Esqueleto del plugin y de la plantilla

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `LICENSE`, `.gitignore`
- Create: `plantilla/package.json`, `plantilla/tsconfig.json`, `plantilla/vitest.config.ts`, `plantilla/wrangler.jsonc`, `plantilla/src/index.ts`, `plantilla/schema.sql` (vacío por ahora)
- Test: `plantilla/test/salud.test.ts`

**Interfaces:**
- Produces: `interface Env { DB: D1Database; MODO?: string; ZERNIO_API_KEY: string; ZERNIO_WEBHOOK_SECRET?: string; OPENROUTER_API_KEY: string; MODELO_TEXTO: string; MODELO_AUDIO: string; HORAS_PAUSA?: string }` exportada desde `plantilla/src/index.ts`.
- `wrangler.jsonc` con placeholders `__NOMBRE_WORKER__` y `__D1_ID__` (los reemplaza la skill), `compatibility_date` actual, binding `DB`, regla de módulos `Text` para `*.md` y `*.json` de `config/`.

- [ ] **Step 1:** `git init` en `plugins/iamautom-whatsapp/`; `.gitignore` con `node_modules`, `.dev.vars`, `.wrangler`.
- [ ] **Step 2:** Antes de escribir config, consultar la doc oficial de `@cloudflare/vitest-pool-workers` (Context7) y usar la forma de config vigente.
- [ ] **Step 3: Test que falla** — `salud.test.ts`: `GET /` responde 200 con JSON `{ ok: true, bot: "iamautom-whatsapp" }`.
- [ ] **Step 4:** `cd plantilla && npm install && npx vitest run` → FAIL.
- [ ] **Step 5:** Implementar el handler `fetch` mínimo en `src/index.ts`.
- [ ] **Step 6:** `npx vitest run` → PASS.
- [ ] **Step 7:** Commit `feat: esqueleto del plugin y plantilla del worker`.

### Task 2: Verificación de firma

**Files:** Create `plantilla/src/firma.ts` · Test `plantilla/test/firma.test.ts`

**Interfaces:**
- Produces: `verificarFirma(cuerpoCrudo: string, firma: string | null, secreto: string | undefined, modo: string | undefined): Promise<boolean>`

- [ ] **Step 1: Tests que fallan:**
  - firma correcta (calculada en el test con WebCrypto) → `true`
  - un byte del body cambiado → `false`
  - header ausente → `false`
  - secreto distinto → `false`
  - `secreto` undefined y `modo !== "local"` → `false` (Review Focus 4)
  - `secreto` undefined y `modo === "local"` → `true`
- [ ] **Step 2:** `npx vitest run test/firma.test.ts` → FAIL.
- [ ] **Step 3:** Implementar con `crypto.subtle` (HMAC SHA-256 → hex minúsculas) y comparación en tiempo constante (XOR acumulado sobre la longitud completa; longitudes distintas → `false`).
- [ ] **Step 4:** → PASS. **Step 5:** Commit `feat: verificación de firma de zernio`.

### Task 3: Lectura del evento de Zernio

**Files:** Create `plantilla/src/zernio.ts` · Test `plantilla/test/zernio.test.ts` · Fixtures `plantilla/test/fixtures/*.json`

**Interfaces:**
- Produces:
```ts
type Adjunto = { tipo: "audio" | "image" | "video" | "file" | "sticker" | "share"; url: string; notaDeVoz: boolean };
type Evento =
  | { tipo: "entrante"; eventId: string; conversationId: string; accountId: string; telefono: string; texto: string; adjuntos: Adjunto[] }
  | { tipo: "eco_dueno"; eventId: string; telefono: string }
  | { tipo: "ignorar"; eventId: string };
leerEvento(payload: unknown): Evento
enviarTexto(env: Env, conversationId: string, accountId: string, texto: string, claveIdempotencia: string): Promise<void>
bajarAdjunto(env: Env, url: string): Promise<ArrayBuffer | null>   // null si responde != 2xx
```

- [ ] **Step 1:** Leer en docs.zernio.com las páginas `webhooks/inbox/message-received`, el evento `message.sent` y `messages/send-inbox-message`; armar los fixtures con la forma **exacta** documentada (no inventada). Anotar en el commit qué URL respalda cada fixture.
- [ ] **Step 2: Tests que fallan:** `message.received` de texto → `entrante` con `telefono` E.164; con nota de voz → `adjuntos[0]` `{tipo:"audio", notaDeVoz:true}`; `message.sent` con `source: "whatsapp_business_app"` → `eco_dueno`; `message.sent` del propio bot (otra `source`) → `ignorar`; `message.delivered` → `ignorar`; payload sin `id` → lanza error.
- [ ] **Step 3:** → FAIL. **Step 4:** Implementar `leerEvento`. `enviarTexto` hace `POST https://zernio.com/api/v1/inbox/conversations/{conversationId}/messages` con `Authorization: Bearer`, header `Idempotency-Key` y body `{ accountId, message }` (confirmar nombres contra la doc del Step 1). `bajarAdjunto` hace `GET url` con Bearer.
- [ ] **Step 5:** Test de `enviarTexto` con `fetch` mockeado: URL, headers y body exactos. → PASS.
- [ ] **Step 6:** Commit `feat: lectura de eventos y envío por zernio`.

### Task 4: Memoria (D1) y reglas de la charla

**Files:** Create `plantilla/schema.sql`, `plantilla/src/memoria.ts`, `plantilla/src/decidir.ts` · Test `plantilla/test/memoria.test.ts`, `plantilla/test/decidir.test.ts`

**Interfaces:**
- Produces:
```ts
// memoria.ts
marcarProcesado(db: D1Database, eventId: string): Promise<boolean>      // true = primera vez (INSERT OR IGNORE + changes)
historial(db: D1Database, telefono: string, limite?: number): Promise<{ rol: "user" | "assistant"; texto: string }[]>  // default 20, orden cronológico
guardar(db: D1Database, telefono: string, rol: "user" | "assistant", texto: string): Promise<void>
pausadaHasta(db: D1Database, telefono: string): Promise<number | null>   // epoch ms
pausar(db: D1Database, telefono: string, hasta: number): Promise<void>
// decidir.ts (pura)
type Accion = "responder" | "transcribir" | "pedir_texto" | "pausar" | "silencio" | "nada";
decidir(evento: Evento, pausadaHasta: number | null, ahora: number): Accion
```
- Tablas: `eventos(id TEXT PRIMARY KEY)`, `mensajes(id INTEGER PK, telefono, rol, texto, creado)`, `charlas(telefono TEXT PRIMARY KEY, pausada_hasta INTEGER)`.

- [ ] **Step 1: Tests de `decidir` que fallan:** `eco_dueno` → `pausar`; `entrante` con pausa vigente (`pausadaHasta > ahora`) → `silencio`; pausa vencida → `responder`; con nota de voz o audio → `transcribir`; sólo imagen/sticker/video sin texto → `pedir_texto`; imagen con texto → `responder`; `ignorar` → `nada`.
- [ ] **Step 2: Tests de memoria que fallan** (pool de Workers con D1 y `schema.sql` aplicado): `marcarProcesado` devuelve `true` y después `false` para el mismo id; `historial` devuelve los últimos N en orden; `pausar` + `pausadaHasta` ida y vuelta.
- [ ] **Step 3:** → FAIL. **Step 4:** Implementar. **Step 5:** → PASS. **Step 6:** Commit `feat: memoria por cliente y reglas de pausa`.

### Task 5: Cerebro (OpenRouter) y transcripción de audio

**Files:** Create `plantilla/src/cerebro.ts`, `plantilla/config/negocio.ejemplo.json`, `plantilla/config/conocimiento.ejemplo.md` · Test `plantilla/test/cerebro.test.ts` · Create `scripts/probar-audio.mjs`

**Interfaces:**
- Produces:
```ts
type Negocio = { nombre: string; rubro: string; nombreBot: string; tono: string; horario: string; contactoHumano: string };
armarSistema(negocio: Negocio, conocimiento: string): string
responder(env: Env, sistema: string, historial: {rol:"user"|"assistant";texto:string}[], texto: string): Promise<{ texto: string; pasarAHumano: boolean }>
transcribir(env: Env, audio: ArrayBuffer): Promise<string | null>   // null si falla
```
- Marca de derivación: el modelo empieza su respuesta con `[[HUMANO]]` cuando hay que pasar a una persona; `responder` la quita y pone `pasarAHumano: true`.

- [ ] **Step 1 (spike, antes que nada):** `scripts/probar-audio.mjs` manda una nota de voz `.ogg` real de WhatsApp (en español rioplatense, grabada por Tincho) a `POST https://openrouter.ai/api/v1/chat/completions` con una parte `{ type: "input_audio", input_audio: { data: <base64>, format: "ogg" } }`, contra los modelos que `GET /api/v1/models` marque con `"audio"` en `architecture.input_modalities`. Elegir el `MODELO_AUDIO` que transcriba bien, anotar id y costo por audio en el README. Si ningún modelo acepta `ogg`, **parar y avisar a Tincho**: el Worker no puede convertir audio.
- [ ] **Step 2: Tests que fallan** (fetch mockeado): `armarSistema` incluye el nombre del bot, el horario, el conocimiento y la regla literal "Si un dato no está en la información del negocio, decí que no lo tenés y ofrecé pasar con una persona. Nunca inventes precios, stock ni promesas." y la instrucción de `[[HUMANO]]`; `responder` manda `model: env.MODELO_TEXTO` y el historial en orden; respuesta `"[[HUMANO]] Te paso con..."` → `{ texto: "Te paso con...", pasarAHumano: true }`; respuesta HTTP 402 → lanza error; `transcribir` con 500 → `null`.
- [ ] **Step 3:** → FAIL. **Step 4:** Implementar. **Step 5:** → PASS. **Step 6:** Commit `feat: cerebro con openrouter y audios`.

### Task 6: El webhook completo

**Files:** Modify `plantilla/src/index.ts` · Create `plantilla/src/procesar.ts` · Test `plantilla/test/webhook.test.ts`

**Interfaces:**
- Consumes: todo lo de Tasks 2-5.
- Produces: `POST /webhook` (producción) y `POST /simular` (sólo `MODO=local`, body `{ telefono, texto }`, devuelve `{ respuesta }` usando `responder` sin Zernio). `procesar(env: Env, evento: Evento): Promise<void>`.
- Textos fijos: falla de IA → `"En un ratito te responde una persona del equipo."`; adjunto no soportado → `"Por ahora no puedo ver fotos ni stickers. ¿Me lo escribís?"`; audio que no se pudo bajar o transcribir → `"No pude escuchar el audio. ¿Me lo escribís?"`.

- [ ] **Step 1: Tests que fallan** (D1 real del pool, `fetch` a Zernio y OpenRouter mockeado):
  - firma inválida → 401 y nada se procesa
  - evento válido → 200 inmediato; tras `waitUntil`, un `enviarTexto` con `Idempotency-Key = eventId`
  - **mismo evento dos veces** → un solo `enviarTexto` (Review Focus 1)
  - OpenRouter 402 → se envía el texto de falla de IA y la charla queda pausada 12 h (Review Focus 2)
  - audio con `bajarAdjunto` → `null` → se envía el texto de audio fallido (Review Focus 3)
  - `eco_dueno` → charla pausada `HORAS_PAUSA` h; el siguiente `entrante` → ningún envío
  - respuesta con `[[HUMANO]]` → se envía el texto sin la marca y la charla queda pausada
  - `POST /simular` con `MODO` distinto de `local` → 404
- [ ] **Step 2:** → FAIL. **Step 3:** Implementar. Orden en `/webhook`: leer body crudo → firma → `leerEvento` → `marcarProcesado` (si `false`, 200 y fin) → `ctx.waitUntil(procesar(...))` → 200.
- [ ] **Step 4:** → PASS. **Step 5:** Commit `feat: webhook de punta a punta`.

### Task 7: Conectar OpenRouter con un botón

**Files:** Create `scripts/openrouter-login.mjs`, `scripts/lib/pkce.mjs`, `scripts/lib/abrir.mjs` · Test `scripts/test/pkce.test.mjs` (con `node --test`)

**Interfaces:**
- Produces: `node scripts/openrouter-login.mjs --carpeta <ruta-del-bot> [--limite 5]` → escribe `OPENROUTER_API_KEY=...` en `<carpeta>/.dev.vars` (crea o reemplaza esa línea, conserva las demás) e imprime "Listo: OpenRouter conectado." sin mostrar la clave. `pkce.mjs`: `crearVerificador(): string`, `desafio(verificador: string): string`. `abrir.mjs`: `abrir(url: string): void` (`open` en macOS, `start ""` en Windows, `xdg-open` en Linux).

- [ ] **Step 1: Tests que fallan:** `desafio("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk") === "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"` (vector de RFC 7636); `crearVerificador()` tiene entre 43 y 128 caracteres válidos; la línea de `.dev.vars` se reemplaza sin duplicarse.
- [ ] **Step 2:** `node --test scripts/test/` → FAIL.
- [ ] **Step 3:** Implementar: servidor `http` en un puerto libre de `localhost`, abre `https://openrouter.ai/auth?callback_url=http://localhost:<puerto>/callback&code_challenge=<d>&code_challenge_method=S256&limit=<limite>&key_label=iamautom-whatsapp`, recibe `code`, hace `POST https://openrouter.ai/api/v1/auth/keys` con `{ code, code_verifier, code_challenge_method: "S256" }`, guarda `key`, muestra una página "Ya podés cerrar esta pestaña" y cierra el servidor. Timeout 10 min con mensaje claro.
- [ ] **Step 4:** → PASS. **Step 5:** Prueba manual con la cuenta de Tincho: la clave aparece en `.dev.vars` y `GET https://openrouter.ai/api/v1/key` con esa clave muestra el límite de US$ 5.
- [ ] **Step 6:** Commit `feat: conectar openrouter con un clic`.

### Task 8: Scripts de Zernio y simulador

**Files:** Create `scripts/zernio.mjs`, `scripts/chat-local.mjs` · Test `scripts/test/zernio.test.mjs`

**Interfaces:**
- Produces:
  - `node scripts/zernio.mjs sandbox <telefono>` → crea la sesión del sandbox y espera hasta `active` (avisa que hay que responder el mensaje en el celular).
  - `node scripts/zernio.mjs conectar` → imprime y abre la URL de `GET /v1/connect/whatsapp` (coexistencia: sin `onboarding`, que por defecto es `business_app`).
  - `node scripts/zernio.mjs webhook <url-del-worker>` → `POST /v1/webhooks/settings` con eventos `message.received` y `message.sent`; guarda el secreto devuelto como `ZERNIO_WEBHOOK_SECRET` en `.dev.vars`.
  - Leen `ZERNIO_API_KEY` de `<carpeta>/.dev.vars`. Funciones puras exportadas para tests: `pedidoWebhook(url): { metodo, ruta, cuerpo }`, `pedidoSandbox(telefono)`.
  - `node scripts/chat-local.mjs` → bucle de chat contra `http://localhost:8787/simular`.
- [ ] **Step 1:** Confirmar en docs.zernio.com los campos exactos de `webhooks/settings` (incluido dónde viene el secreto) y de `whatsapp/sandbox/sessions`.
- [ ] **Step 2: Tests que fallan** de `pedidoWebhook`/`pedidoSandbox` (ruta, método, cuerpo con los nombres de la doc; teléfono normalizado sin `+`).
- [ ] **Step 3:** → FAIL. **Step 4:** Implementar. **Step 5:** → PASS. **Step 6:** Commit `feat: scripts de zernio y simulador local`.

### Task 9: Las skills `/crear-bot` y `/actualizar-bot` + prueba de punta a punta

**Files:** Create `skills/crear-bot/SKILL.md`, `skills/actualizar-bot/SKILL.md`

**Contenido de `crear-bot` (el recorrido del spec, en orden, una pregunta por vez):**
1. Revisar Node ≥ 18 y explicar en 5 líneas qué va a pasar y cuánto cuesta (cifras de la sección de costos del spec).
2. Entrevista: nombre del negocio, rubro, nombre y tono del bot, horario, archivos (convertir PDF/Excel/texto a `config/conocimiento.md` legible; avisar si pasa de ~200 KB), contacto humano. Guardar `config/negocio.json`.
3. Copiar `plantilla/` a la carpeta elegida por el usuario (default `~/mi-bot-whatsapp`), `npm install`, `MODO=local` y modelo gratuito en `.dev.vars`.
4. `openrouter-login.mjs`. 5. `npx wrangler dev` + `chat-local.mjs`: el usuario prueba y pide ajustes; no avanzar sin su OK.
6. `npx wrangler login` → `npx wrangler d1 create` → completar `__D1_ID__` → `d1 execute --remote --file schema.sql` → `wrangler secret put` de cada clave → `npx wrangler deploy`.
7. Clave de Zernio guiada paso a paso (`zernio.com/dashboard/api-keys`) → sandbox para probar → exigir crédito en OpenRouter y cambiar `MODELO_TEXTO` a pago → `zernio.mjs conectar` (verificar que usa **WhatsApp Business**, no el común) → `zernio.mjs webhook`.
8. Prueba con su celular, explicar la ventana de 24 h y la pausa de 12 h, cierre de marca: "Si te trabaste o lo querés más completo (turnos, pedidos, varias sucursales), lo armamos nosotros: iamautom.com". Sin precios.

**`actualizar-bot`:** pide qué cambió → actualiza `negocio.json`/`conocimiento.md` → simulador → `npx wrangler deploy`.

- [ ] **Step 1:** Escribir ambas skills (voseo, frases cortas, una pregunta por vez).
- [ ] **Step 2: Prueba real de punta a punta** con un negocio inventado (ej. "Pizzería Don Tito") en una carpeta temporal, siguiendo `/crear-bot` como lo haría un usuario. Evidencia requerida (skill `proof-first`): captura del celular de Tincho con (a) respuesta a un texto, (b) respuesta a una nota de voz, (c) "¿cuánto sale el envío?" sin dato cargado → no inventa y ofrece persona, (d) Tincho contesta desde su app y el bot se calla.
- [ ] **Step 3:** `/actualizar-bot` cambiando un precio → el bot responde el precio nuevo.
- [ ] **Step 4:** Commit `feat: skills crear-bot y actualizar-bot`.

### Task 10: README con marca y publicación

**Files:** Create `README.md`, `docs/assets/` (portada)

- [ ] **Step 1:** README en voseo: qué es, qué necesitás (Claude Code + Node), instalación en dos líneas (`/plugin marketplace add MartinOlivero/iamautom-whatsapp` y `/plugin install iamautom-whatsapp`), `/crear-bot`, cuánto cuesta (tabla con cifras verificadas y fecha), qué no hace en v1, cierre con iamautom.com. Paleta cobre/tinta/verde, nada de violeta. Link de afiliado de Zernio sólo si Tincho fue aprobado.
- [ ] **Step 2:** Portada con la skill `iamautom-brand`.
- [ ] **Step 3:** Pedirle a Tincho el OK y recién ahí: crear `github.com/MartinOlivero/iamautom-whatsapp` público, push, y probar la instalación desde GitHub en una sesión limpia.
- [ ] **Step 4:** Commit `docs: readme y portada`.
