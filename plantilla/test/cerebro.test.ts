import { describe, it, expect, vi, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { armarSistema, responder, transcribir } from "../src/cerebro";
import negocio from "../config/negocio.json";

const ok = (contenido: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content: contenido } }] }), { status: 200 });

afterEach(() => vi.restoreAllMocks());

describe("armarSistema", () => {
  const s = armarSistema(negocio, "Muzzarella: $ 12.000");
  it("incluye nombre del bot, horario y conocimiento", () => {
    expect(s).toContain("Tito");
    expect(s).toContain("Martes a domingo de 19 a 24 h.");
    expect(s).toContain("Muzzarella: $ 12.000");
  });
  it("prohíbe inventar", () => {
    expect(s).toContain("Si un dato no está en la información del negocio, di que no lo tienes y ofrece pasar con una persona. Nunca inventes precios, stock ni promesas.");
  });
  it("explica la marca para pasar a una persona", () => {
    expect(s).toContain("[[HUMANO]]");
  });
});

describe("responder", () => {
  it("manda el modelo, el sistema y el historial en orden", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok("Abrimos a las 19"));
    const r = await responder(env, "SIS", [{ rol: "user", texto: "hola" }, { rol: "assistant", texto: "¡Hola!" }], "¿a qué hora abren?");
    expect(r).toEqual({ texto: "Abrimos a las 19", pasarAHumano: false });
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer or_test");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe(env.MODELO_TEXTO);
    expect(body.messages).toEqual([
      { role: "system", content: "SIS" },
      { role: "user", content: "hola" },
      { role: "assistant", content: "¡Hola!" },
      { role: "user", content: "¿a qué hora abren?" },
    ]);
  });
  it("detecta la marca [[HUMANO]] y la quita", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(ok("[[HUMANO]] Te paso con Marcela."));
    expect(await responder(env, "S", [], "quiero hablar con alguien")).toEqual({ texto: "Te paso con Marcela.", pasarAHumano: true });
  });
  it("sin crédito (402) lanza error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 402 }));
    await expect(responder(env, "S", [], "hola")).rejects.toThrow();
  });
  it("respuesta vacía lanza error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(ok(""));
    await expect(responder(env, "S", [], "hola")).rejects.toThrow();
  });
});

describe("transcribir", () => {
  it("manda el audio en base64 como ogg al modelo de audio", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok("quiero una muzza"));
    const audio = new Uint8Array([1, 2, 3]).buffer;
    expect(await transcribir(env, audio)).toBe("quiero una muzza");
    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe("modelo/audio-test");
    const parte = body.messages[0].content.find((p: any) => p.type === "input_audio");
    expect(parte.input_audio).toEqual({ data: "AQID", format: "ogg" });
  });
  it("si falla devuelve null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("x", { status: 500 }));
    expect(await transcribir(env, new ArrayBuffer(1))).toBeNull();
  });
});

describe("idioma", () => {
  it("pide español neutro, sin voseo ni regionalismos", () => {
    const s = armarSistema(negocio, "x");
    expect(s).toContain("Responde en español neutro (de tú, sin regionalismos)");
    expect(s).not.toMatch(/\b(Sos|Respondé|decí|tenés|ofrecé|empezá|avisale|Usá)\b/);
  });
});
