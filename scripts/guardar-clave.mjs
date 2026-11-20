// Guarda una clave en <carpeta>/.dev.vars leyéndola de la entrada estándar, no del comando:
// así no queda visible en la lista de procesos y funciona igual en Mac, Windows y Linux.
//
// Uso: echo <clave> | node guardar-clave.mjs --carpeta <ruta-del-bot> --nombre ZERNIO_API_KEY
import { text } from "node:stream/consumers";
import { guardarVariable } from "./lib/dev-vars.mjs";

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const carpeta = arg("--carpeta");
const nombre = arg("--nombre");
if (!carpeta || !nombre) {
  console.error("Uso: node guardar-clave.mjs --carpeta <ruta-del-bot> --nombre <NOMBRE> (la clave va por la entrada)");
  process.exit(1);
}
const valor = (await text(process.stdin)).trim();
if (!valor) {
  console.error("No llegó ninguna clave.");
  process.exit(1);
}
await guardarVariable(carpeta, nombre, valor);
console.log(`Listo: ${nombre} quedó guardada en .dev.vars.`);
