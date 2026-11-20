import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { leerVariable } from "../lib/dev-vars.mjs";

const SCRIPT = fileURLToPath(new URL("../guardar-clave.mjs", import.meta.url));

test("guarda la clave leída de la entrada (no del comando), sin espacios ni \\r", async () => {
  const carpeta = await mkdtemp(join(tmpdir(), "bot-"));
  const r = spawnSync(process.execPath, [SCRIPT, "--carpeta", carpeta, "--nombre", "ZERNIO_API_KEY"], { input: "  sk_abc123\r\n", encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.stdout.includes("sk_abc123"), "no debe mostrar la clave");
  assert.equal(await leerVariable(carpeta, "ZERNIO_API_KEY"), "sk_abc123");
});

test("una clave vacía no se guarda", async () => {
  const carpeta = await mkdtemp(join(tmpdir(), "bot-"));
  const r = spawnSync(process.execPath, [SCRIPT, "--carpeta", carpeta, "--nombre", "ZERNIO_API_KEY"], { input: "\n", encoding: "utf8" });
  assert.notEqual(r.status, 0);
});

test("leerVariable ignora el \\r de un archivo editado en Windows", async () => {
  const carpeta = await mkdtemp(join(tmpdir(), "bot-"));
  await writeFile(join(carpeta, ".dev.vars"), "MODO=local\r\nZERNIO_API_KEY=zk\r\n");
  assert.equal(await leerVariable(carpeta, "ZERNIO_API_KEY"), "zk");
});
