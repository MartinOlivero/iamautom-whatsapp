import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  // Las tablas de la base se crean igual que en producción, desde migraciones/.
  const migraciones = await readD1Migrations("./migraciones");
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            MIGRACIONES: migraciones,
            MODO: "test",
            ZERNIO_API_KEY: "zk_test",
            ZERNIO_WEBHOOK_SECRET: "secreto_test",
            OPENROUTER_API_KEY: "or_test",
            MODELO_AUDIO: "modelo/audio-test",
          },
        },
      }),
    ],
  };
});
