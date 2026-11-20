import { test } from "node:test";
import assert from "node:assert/strict";
import { secretosParaProduccion } from "../publicar-secretos.mjs";

test("sólo pasan las claves del bot; MODO y el modelo de prueba nunca llegan a producción", () => {
  const devVars = "MODO=local\nMODELO_TEXTO=google/gemma-4-31b-it:free\nOPENROUTER_API_KEY=or\nZERNIO_API_KEY=zk\nZERNIO_WEBHOOK_SECRET=s\nOTRA=x\n";
  assert.deepEqual(secretosParaProduccion(devVars), { OPENROUTER_API_KEY: "or", ZERNIO_API_KEY: "zk", ZERNIO_WEBHOOK_SECRET: "s" });
});

test("falla si falta una clave obligatoria", () => {
  assert.throws(() => secretosParaProduccion("OPENROUTER_API_KEY=or\nZERNIO_API_KEY=zk\n"), /ZERNIO_WEBHOOK_SECRET/);
});
