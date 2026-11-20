import { describe, it, expect } from "vitest";
import { decidir } from "../src/decidir";
import type { Evento } from "../src/zernio";

const ahora = Date.parse("2026-11-19T20:00:00Z");
const entrante = (texto: string, adjuntos: any[] = []): Evento =>
  ({ tipo: "entrante", eventId: "e", conversationId: "c", accountId: "a", telefono: "+54", texto, adjuntos });
const audio = { tipo: "audio", url: "u", notaDeVoz: true };
const foto = { tipo: "image", url: "u", notaDeVoz: false };

describe("decidir", () => {
  it("el dueño contestó → pausar", () => {
    expect(decidir({ tipo: "eco_dueno", eventId: "e", conversationId: "c" }, null, ahora)).toBe("pausar");
  });
  it("charla pausada → silencio", () => {
    expect(decidir(entrante("hola"), ahora + 1000, ahora)).toBe("silencio");
  });
  it("pausa vencida → responder", () => {
    expect(decidir(entrante("hola"), ahora - 1000, ahora)).toBe("responder");
  });
  it("texto sin pausa → responder", () => {
    expect(decidir(entrante("hola"), null, ahora)).toBe("responder");
  });
  it("nota de voz → transcribir", () => {
    expect(decidir(entrante("", [audio]), null, ahora)).toBe("transcribir");
  });
  it("sólo foto o sticker → pedir texto", () => {
    expect(decidir(entrante("", [foto]), null, ahora)).toBe("pedir_texto");
    expect(decidir(entrante("", [{ ...foto, tipo: "sticker" }]), null, ahora)).toBe("pedir_texto");
  });
  it("foto con texto → responder al texto", () => {
    expect(decidir(entrante("¿tienen este modelo?", [foto]), null, ahora)).toBe("responder");
  });
  it("evento ignorado → nada", () => {
    expect(decidir({ tipo: "ignorar", eventId: "e" }, null, ahora)).toBe("nada");
  });
});
