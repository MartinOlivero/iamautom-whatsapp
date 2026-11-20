import { describe, it, expect, vi, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { leerEvento, enviarTexto } from "../src/zernio";
import texto from "./fixtures/recibido-texto.json";
import voz from "./fixtures/recibido-nota-de-voz.json";
import eco from "./fixtures/enviado-desde-celular.json";

const copia = <T>(o: T): any => JSON.parse(JSON.stringify(o));

describe("leerEvento", () => {
  it("mensaje de texto entrante", () => {
    expect(leerEvento(texto)).toEqual({
      tipo: "entrante", eventId: "evt_txt_1", conversationId: "conv_1", accountId: "acc_1",
      telefono: "+5491122334455", texto: "Hola, ¿a qué hora abren?", adjuntos: [],
    });
  });
  it("nota de voz entrante", () => {
    const e = leerEvento(voz);
    expect(e.tipo).toBe("entrante");
    if (e.tipo !== "entrante") return;
    expect(e.texto).toBe("");
    expect(e.adjuntos).toEqual([{ tipo: "audio", url: "https://zernio.com/api/v1/whatsapp/media/m_1", notaDeVoz: true }]);
  });
  it("el dueño contestó desde su celular", () => {
    expect(leerEvento(eco)).toEqual({ tipo: "eco_dueno", eventId: "evt_eco_1", conversationId: "conv_1" });
  });
  it("lo que manda el propio bot se ignora", () => {
    const p = copia(eco); p.message.source = "cloud_api";
    expect(leerEvento(p)).toEqual({ tipo: "ignorar", eventId: "evt_eco_1" });
  });
  it("otros eventos se ignoran", () => {
    const p = copia(texto); p.event = "message.delivered";
    expect(leerEvento(p)).toEqual({ tipo: "ignorar", eventId: "evt_txt_1" });
  });
  it("mensajes en espera (standby) se ignoran", () => {
    const p = copia(texto); p.metadata = { standby: true };
    expect(leerEvento(p).tipo).toBe("ignorar");
  });
  it("otra plataforma que no sea WhatsApp se ignora", () => {
    const p = copia(texto); p.message.platform = "instagram";
    expect(leerEvento(p).tipo).toBe("ignorar");
  });
  it("sin teléfono usa el id del remitente", () => {
    const p = copia(texto); delete p.message.sender.phoneNumber;
    const e = leerEvento(p);
    expect(e.tipo === "entrante" && e.telefono).toBe("snd_1");
  });
  it("payload sin id lanza error", () => {
    const p = copia(texto); delete p.id;
    expect(() => leerEvento(p)).toThrow();
  });
});

describe("enviarTexto", () => {
  afterEach(() => vi.restoreAllMocks());
  it("manda el mensaje a la conversación con clave de idempotencia", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"success":true}', { status: 200 }));
    await enviarTexto(env, "conv_1", "acc_1", "Abrimos a las 9", "evt_txt_1");
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://zernio.com/api/v1/inbox/conversations/conv_1/messages");
    expect(init.method).toBe("POST");
    const h = new Headers(init.headers);
    expect(h.get("authorization")).toBe("Bearer zk_test");
    expect(h.get("idempotency-key")).toBe("evt_txt_1");
    expect(JSON.parse(init.body as string)).toEqual({ accountId: "acc_1", message: "Abrimos a las 9" });
  });
  it("si Zernio responde error, lanza", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("no", { status: 500 }));
    await expect(enviarTexto(env, "c", "a", "t", "k")).rejects.toThrow();
  });
});
