// Prueba qué modelos de OpenRouter entienden una nota de voz de WhatsApp (.ogg).
// Uso: OPENROUTER_API_KEY=... node scripts/probar-audio.mjs nota.ogg [modelo1 modelo2 ...]
// Sin modelos, prueba todos los que OpenRouter marca con entrada de audio.
import { readFile } from "node:fs/promises";

const clave = process.env.OPENROUTER_API_KEY;
const [archivo, ...elegidos] = process.argv.slice(2);
if (!clave || !archivo) {
  console.error("Uso: OPENROUTER_API_KEY=... node scripts/probar-audio.mjs nota.ogg [modelos...]");
  process.exit(1);
}
const audio = (await readFile(archivo)).toString("base64");

let modelos = elegidos;
if (!modelos.length) {
  const r = await fetch("https://openrouter.ai/api/v1/models");
  const { data } = await r.json();
  modelos = data.filter((m) => m.architecture?.input_modalities?.includes("audio")).map((m) => m.id);
  console.log(`Modelos con entrada de audio: ${modelos.length}`);
}

for (const modelo of modelos) {
  const inicio = Date.now();
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelo,
      usage: { include: true },
      messages: [{ role: "user", content: [
        { type: "text", text: "Transcribí este audio en español tal cual se dice. Devolvé sólo la transcripción." },
        { type: "input_audio", input_audio: { data: audio, format: "ogg" } },
      ] }],
    }),
  });
  const datos = await r.json().catch(() => ({}));
  const texto = datos?.choices?.[0]?.message?.content ?? JSON.stringify(datos?.error ?? datos).slice(0, 160);
  console.log(`\n[${modelo}] HTTP ${r.status} · ${Date.now() - inicio} ms · costo US$ ${datos?.usage?.cost ?? "?"}\n${texto}`);
}
