import { describe, it, expect, beforeAll } from "vitest";
import { env, applyD1Migrations } from "cloudflare:test";
import { marcarProcesado, historial, guardar, pausadaHasta, pausar } from "../src/memoria";

beforeAll(async () => { await applyD1Migrations(env.DB, (env as any).MIGRACIONES); });

describe("memoria", () => {
  it("un evento se procesa una sola vez", async () => {
    expect(await marcarProcesado(env.DB, "evt_a")).toBe(true);
    expect(await marcarProcesado(env.DB, "evt_a")).toBe(false);
  });
  it("historial devuelve los últimos N en orden cronológico", async () => {
    for (let i = 1; i <= 5; i++) await guardar(env.DB, "conv_h", i % 2 ? "user" : "assistant", `m${i}`);
    await guardar(env.DB, "otra", "user", "ajeno");
    expect(await historial(env.DB, "conv_h", 3)).toEqual([
      { rol: "user", texto: "m3" }, { rol: "assistant", texto: "m4" }, { rol: "user", texto: "m5" },
    ]);
  });
  it("pausa ida y vuelta", async () => {
    expect(await pausadaHasta(env.DB, "conv_p")).toBeNull();
    await pausar(env.DB, "conv_p", 123);
    await pausar(env.DB, "conv_p", 456);
    expect(await pausadaHasta(env.DB, "conv_p")).toBe(456);
  });
});
