import { SELF } from "cloudflare:test";
import { it, expect } from "vitest";

it("GET / responde que el bot está vivo", async () => {
  const r = await SELF.fetch("https://bot.test/");
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ ok: true, bot: "iamautom-whatsapp" });
});
