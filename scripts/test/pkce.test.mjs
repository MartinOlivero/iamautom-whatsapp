import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crearVerificador, desafio } from "../lib/pkce.mjs";
import { guardarVariable } from "../lib/dev-vars.mjs";

test("desafío S256 coincide con el vector de la RFC 7636", () => {
  assert.equal(desafio("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
});

test("el verificador tiene entre 43 y 128 caracteres válidos", () => {
  const v = crearVerificador();
  assert.match(v, /^[A-Za-z0-9\-._~]{43,128}$/);
  assert.notEqual(v, crearVerificador());
});

test("guardarVariable reemplaza la línea sin duplicarla y conserva las demás", async () => {
  const dir = await mkdtemp(join(tmpdir(), "devvars-"));
  const archivo = join(dir, ".dev.vars");
  await writeFile(archivo, "MODO=local\nOPENROUTER_API_KEY=vieja\n");
  await guardarVariable(dir, "OPENROUTER_API_KEY", "nueva");
  await guardarVariable(dir, "ZERNIO_API_KEY", "zk");
  assert.equal(await readFile(archivo, "utf8"), "MODO=local\nOPENROUTER_API_KEY=nueva\nZERNIO_API_KEY=zk\n");
});

test("guardarVariable crea el archivo si no existe", async () => {
  const dir = await mkdtemp(join(tmpdir(), "devvars-"));
  await guardarVariable(dir, "A", "1");
  assert.equal(await readFile(join(dir, ".dev.vars"), "utf8"), "A=1\n");
});
