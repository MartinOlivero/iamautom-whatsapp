import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { env, applyD1Migrations, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import worker from "../src/index";
import { pausadaHasta, pausar } from "../src/memoria";
import base from "./fixtures/recibido-texto.json";
import voz from "./fixtures/recibido-nota-de-voz.json";
import eco from "./fixtures/enviado-desde-celular.json";

beforeAll(async () => { await applyD1Migrations(env.DB, (env as any).MIGRACIONES); });

async function firmar(cuerpo: string, secreto = "secreto_test") {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(cuerpo));
  return [...new Uint8Array(s)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

let n = 0;
// Cada test usa ids propios para no pisarse en la base compartida.
function evento(plantilla: any, cambios: (p: any) => void = () => {}) {
  const p = JSON.parse(JSON.stringify(plantilla));
  n++;
  p.id = `evt_${n}`;
  p.message.conversationId = `conv_${n}`;
  cambios(p);
  return p;
}

async function llamar(payload: any, opciones: { firma?: string; ruta?: string; envExtra?: object } = {}) {
  const cuerpo = JSON.stringify(payload);
  const firma = opciones.firma ?? (await firmar(cuerpo));
  const pedido = new Request(`https://bot.test${opciones.ruta ?? "/webhook"}`, {
    method: "POST", body: cuerpo, headers: { "X-Zernio-Signature": firma, "Content-Type": "application/json" },
  });
  const ctx = createExecutionContext();
  const r = await worker.fetch(pedido, { ...env, ...opciones.envExtra } as any, ctx);
  await waitOnExecutionContext(ctx);
  return r;
}

// Simula a OpenRouter, Zernio y la descarga de audios. Guarda lo que se le mandó a Zernio.
let enviados: { url: string; body: any; idem: string | null }[];
let iaResponde: () => Response;
let audioResponde: () => Response;
const okIA = (t: string) => new Response(JSON.stringify({ choices: [{ message: { content: t } }] }));

beforeEach(() => {
  enviados = [];
  iaResponde = () => okIA("¡Hola! Abrimos a las 19.");
  audioResponde = () => new Response(new Uint8Array([1, 2, 3]));
  vi.spyOn(globalThis, "fetch").mockImplementation(async (entrada: any, init?: any) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada);
    if (url.startsWith("https://openrouter.ai/")) {
      const body = JSON.parse(init.body);
      if (body.model === env.MODELO_AUDIO) return okIA("quiero una muzza");
      return iaResponde();
    }
    if (url.includes("/whatsapp/media/")) return audioResponde();
    if (url.includes("/inbox/conversations/")) {
      enviados.push({ url, body: JSON.parse(init.body), idem: new Headers(init.headers).get("idempotency-key") });
      return new Response('{"success":true}');
    }
    throw new Error(`fetch inesperado: ${url}`);
  });
});
afterEach(() => vi.restoreAllMocks());

describe("POST /webhook", () => {
  it("firma inválida → 401 y no se procesa nada", async () => {
    const r = await llamar(evento(base), { firma: "00" });
    expect(r.status).toBe(401);
    expect(enviados).toHaveLength(0);
  });

  it("mensaje válido → 200 y una respuesta con la clave del evento", async () => {
    const p = evento(base);
    const r = await llamar(p);
    expect(r.status).toBe(200);
    expect(enviados).toEqual([{ url: `https://zernio.com/api/v1/inbox/conversations/${p.message.conversationId}/messages`, body: { accountId: "acc_1", message: "¡Hola! Abrimos a las 19." }, idem: p.id }]);
  });

  it("el mismo evento dos veces → una sola respuesta", async () => {
    const p = evento(base);
    expect((await llamar(p)).status).toBe(200);
    expect((await llamar(p)).status).toBe(200);
    expect(enviados).toHaveLength(1);
  });

  it("la IA falla (sin crédito) → avisa que responde una persona y pausa la charla", async () => {
    iaResponde = () => new Response("{}", { status: 402 });
    const p = evento(base);
    await llamar(p);
    expect(enviados.map((e) => e.body.message)).toEqual(["En un ratito te responde una persona del equipo."]);
    expect(await pausadaHasta(env.DB, p.message.conversationId)).toBeGreaterThan(Date.now());
  });

  it("nota de voz → se transcribe y se responde", async () => {
    await llamar(evento(voz));
    expect(enviados.map((e) => e.body.message)).toEqual(["¡Hola! Abrimos a las 19."]);
  });

  it("audio que ya no se puede bajar → pide que lo escriba", async () => {
    audioResponde = () => new Response("expirado", { status: 400 });
    await llamar(evento(voz));
    expect(enviados.map((e) => e.body.message)).toEqual(["No pude escuchar el audio. ¿Me lo escribís?"]);
  });

  it("foto sin texto → pide que lo escriba", async () => {
    await llamar(evento(base, (p) => { p.message.text = null; p.message.attachments = [{ type: "image", url: "https://x/y" }]; }));
    expect(enviados.map((e) => e.body.message)).toEqual(["Por ahora no puedo ver fotos ni stickers. ¿Me lo escribís?"]);
  });

  it("el dueño contesta desde el celular → la charla queda pausada 12 h y el bot se calla", async () => {
    const e = evento(eco);
    const charla = e.message.conversationId;
    await llamar(e);
    const hasta = (await pausadaHasta(env.DB, charla))!;
    expect(hasta - Date.now()).toBeGreaterThan(11.9 * 3600e3);
    expect(hasta - Date.now()).toBeLessThanOrEqual(12 * 3600e3);
    await llamar(evento(base, (p) => { p.message.conversationId = charla; }));
    expect(enviados).toHaveLength(0);
  });

  it("pausa vencida → el bot vuelve a responder", async () => {
    const p = evento(base);
    await pausar(env.DB, p.message.conversationId, Date.now() - 1);
    await llamar(p);
    expect(enviados).toHaveLength(1);
  });

  it("la IA pide pasar a una persona → manda el texto sin la marca y pausa", async () => {
    iaResponde = () => okIA("[[HUMANO]] Te paso con Marcela.");
    const p = evento(base);
    await llamar(p);
    expect(enviados.map((e) => e.body.message)).toEqual(["Te paso con Marcela."]);
    expect(await pausadaHasta(env.DB, p.message.conversationId)).toBeGreaterThan(Date.now());
  });
});

describe("POST /simular", () => {
  it("fuera de modo local → 404", async () => {
    const r = await llamar({ telefono: "1", texto: "hola" }, { ruta: "/simular" });
    expect(r.status).toBe(404);
  });
  it("en modo local responde sin pasar por Zernio", async () => {
    const r = await llamar({ telefono: "1", texto: "hola" }, { ruta: "/simular", envExtra: { MODO: "local" } });
    expect(await r.json()).toEqual({ respuesta: "¡Hola! Abrimos a las 19.", pasarAHumano: false });
    expect(enviados).toHaveLength(0);
  });
});
