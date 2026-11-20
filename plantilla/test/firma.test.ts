import { describe, it, expect } from "vitest";
import { verificarFirma } from "../src/firma";

// Calcula la firma igual que Zernio: HMAC-SHA256 en hex minúsculas sobre el body crudo.
async function firmar(cuerpo: string, secreto: string): Promise<string> {
  const clave = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sello = await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(cuerpo));
  return [...new Uint8Array(sello)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const cuerpo = '{"id":"evt_1","event":"message.received"}';

describe("verificarFirma", () => {
  it("acepta la firma correcta", async () => {
    expect(await verificarFirma(cuerpo, await firmar(cuerpo, "s3cr3to"), "s3cr3to", undefined)).toBe(true);
  });
  it("rechaza si cambió un byte del body", async () => {
    const f = await firmar(cuerpo, "s3cr3to");
    expect(await verificarFirma(cuerpo.replace("evt_1", "evt_2"), f, "s3cr3to", undefined)).toBe(false);
  });
  it("rechaza si falta el header", async () => {
    expect(await verificarFirma(cuerpo, null, "s3cr3to", undefined)).toBe(false);
  });
  it("rechaza con otro secreto", async () => {
    expect(await verificarFirma(cuerpo, await firmar(cuerpo, "otro"), "s3cr3to", undefined)).toBe(false);
  });
  it("sin secreto en producción rechaza todo (falla cerrado)", async () => {
    expect(await verificarFirma(cuerpo, "cualquiera", undefined, undefined)).toBe(false);
  });
  it("sin secreto en modo local acepta (para probar sin Zernio)", async () => {
    expect(await verificarFirma(cuerpo, null, undefined, "local")).toBe(true);
  });
});
