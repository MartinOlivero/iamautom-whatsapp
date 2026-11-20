// Sube a Cloudflare SÓLO las claves que el bot necesita en producción.
// Importante: MODO=local (que abre el simulador y acepta mensajes sin firma) nunca sale de la compu.
//
// Uso: node publicar-secretos.mjs --carpeta <ruta-del-bot>
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const OBLIGATORIAS = ["OPENROUTER_API_KEY", "ZERNIO_API_KEY", "ZERNIO_WEBHOOK_SECRET"];

export function secretosParaProduccion(devVars) {
  const todas = Object.fromEntries(
    devVars.split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
  const faltan = OBLIGATORIAS.filter((k) => !todas[k]);
  if (faltan.length) throw new Error(`Faltan estas claves en .dev.vars: ${faltan.join(", ")}`);
  return Object.fromEntries(OBLIGATORIAS.map((k) => [k, todas[k]]));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf("--carpeta");
  const carpeta = i > 0 ? process.argv[i + 1] : undefined;
  if (!carpeta) {
    console.error("Uso: node publicar-secretos.mjs --carpeta <ruta-del-bot>");
    process.exit(1);
  }
  try {
    const secretos = secretosParaProduccion(await readFile(join(carpeta, ".dev.vars"), "utf8"));
    // Se pasan por la entrada estándar: nunca quedan escritos en la pantalla ni en otro archivo.
    const r = spawnSync("npx", ["wrangler", "secret", "bulk"], {
      cwd: carpeta,
      input: JSON.stringify(secretos),
      stdio: ["pipe", "inherit", "inherit"],
      shell: process.platform === "win32",
    });
    process.exit(r.status ?? 1);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
