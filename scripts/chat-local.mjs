// Chat de prueba en la terminal: escribes como si fueras un cliente y el bot contesta.
// Necesita el bot corriendo en local (npx wrangler dev) en http://localhost:8787.
import { createInterface } from "node:readline/promises";

const URL_BOT = process.env.URL_BOT ?? "http://localhost:8787/simular";
const telefono = `prueba-${Date.now()}`; // charla nueva cada vez
const consola = createInterface({ input: process.stdin, output: process.stdout });

console.log("Escribe como si fueras un cliente. Para salir: «salir».\n");
for (;;) {
  const texto = (await consola.question("Tú: ")).trim();
  if (!texto) continue;
  if (texto.toLowerCase() === "salir") break;
  try {
    const r = await fetch(URL_BOT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telefono, texto }) });
    if (!r.ok) throw new Error(`el bot respondió ${r.status}`);
    const { respuesta, pasarAHumano } = await r.json();
    console.log(`Bot: ${respuesta}${pasarAHumano ? "\n     (aquí el bot pasaría la charla a una persona y se callaría)" : ""}\n`);
  } catch (e) {
    console.log(`(No pude hablar con el bot: ${e.message}. ¿Está corriendo «npx wrangler dev»?)\n`);
  }
}
consola.close();
