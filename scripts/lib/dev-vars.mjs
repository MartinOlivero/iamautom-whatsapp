// Guarda claves en <carpeta>/.dev.vars (el archivo de secretos locales de Cloudflare,
// que nunca se sube a GitHub). Reemplaza la línea si ya existe.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function guardarVariable(carpeta, nombre, valor) {
  const archivo = join(carpeta, ".dev.vars");
  const actual = await readFile(archivo, "utf8").catch(() => "");
  const lineas = actual.split("\n").filter((l) => l && !l.startsWith(`${nombre}=`));
  lineas.push(`${nombre}=${valor}`);
  await writeFile(archivo, lineas.join("\n") + "\n", { mode: 0o600 });
}

export async function leerVariable(carpeta, nombre) {
  const actual = await readFile(join(carpeta, ".dev.vars"), "utf8").catch(() => "");
  const linea = actual.split("\n").find((l) => l.startsWith(`${nombre}=`));
  return linea ? linea.slice(nombre.length + 1) : undefined;
}
