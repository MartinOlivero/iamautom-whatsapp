import { test } from "node:test";
import assert from "node:assert/strict";
import { pedidoWebhook, pedidoSandbox, pedidoConectar } from "../zernio.mjs";

test("webhook: escucha mensajes recibidos y enviados, con secreto propio", () => {
  const p = pedidoWebhook("https://mi-bot.tito.workers.dev", "s3cr3t0");
  assert.equal(p.metodo, "POST");
  assert.equal(p.ruta, "/webhooks/settings");
  assert.deepEqual(p.cuerpo, {
    name: "iamautom-whatsapp",
    url: "https://mi-bot.tito.workers.dev/webhook",
    secret: "s3cr3t0",
    events: ["message.received", "message.sent"],
  });
});

test("webhook: no duplica /webhook ni la barra final", () => {
  assert.equal(pedidoWebhook("https://x.workers.dev/", "s").cuerpo.url, "https://x.workers.dev/webhook");
  assert.equal(pedidoWebhook("https://x.workers.dev/webhook", "s").cuerpo.url, "https://x.workers.dev/webhook");
});

test("sandbox: teléfono en formato internacional con +", () => {
  assert.deepEqual(pedidoSandbox("54 9 11 2233-4455"), { metodo: "POST", ruta: "/whatsapp/sandbox/sessions", cuerpo: { phone: "+5491122334455" } });
  assert.deepEqual(pedidoSandbox("+5491122334455").cuerpo, { phone: "+5491122334455" });
});

test("conectar: WhatsApp en coexistencia (sin onboarding=api)", () => {
  const p = pedidoConectar("prof_1");
  assert.equal(p.metodo, "GET");
  assert.equal(p.ruta, "/connect/whatsapp?profileId=prof_1");
});
