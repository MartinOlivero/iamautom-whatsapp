// El "cerebro" del bot: arma las instrucciones y le pregunta a la IA (vía OpenRouter).
// Analogía: armarSistema es el manual del empleado nuevo; responder es el empleado
// leyendo la charla y contestando según ese manual.

import type { Env } from "./index";
import type { Turno } from "./memoria";

const URL_OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";
const MARCA_HUMANO = "[[HUMANO]]";

export type Negocio = { nombre: string; rubro: string; nombreBot: string; tono: string; horario: string; contactoHumano: string };

export function armarSistema(n: Negocio, conocimiento: string): string {
  return [
    `Eres ${n.nombreBot}, quien atiende el WhatsApp de ${n.nombre} (${n.rubro}).`,
    `Tono: ${n.tono}. Responde en español neutro (de tú, sin regionalismos), con mensajes cortos como en un chat.`,
    `Horario de atención: ${n.horario}`,
    "",
    "Reglas:",
    "- Usa sólo la información del negocio que está abajo.",
    "- Si un dato no está en la información del negocio, di que no lo tienes y ofrece pasar con una persona. Nunca inventes precios, stock ni promesas.",
    `- Si el cliente pide hablar con una persona, está molesto, o hace falta algo que no puedes resolver, empieza tu respuesta con ${MARCA_HUMANO} y avísale que lo pasas con ${n.contactoHumano}.`,
    "- No digas que eres una IA salvo que te lo pregunten; si te lo preguntan, di la verdad.",
    "",
    "Información del negocio:",
    conocimiento,
  ].join("\n");
}

async function preguntar(env: Env, modelo: string, messages: unknown[]): Promise<string> {
  const r = await fetch(URL_OPENROUTER, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "X-Title": "iamautom-whatsapp",
    },
    body: JSON.stringify({ model: modelo, messages }),
  });
  if (!r.ok) throw new Error(`OpenRouter respondió ${r.status}: ${await r.text()}`);
  const datos: any = await r.json();
  const texto = datos?.choices?.[0]?.message?.content;
  if (typeof texto !== "string" || !texto.trim()) throw new Error("OpenRouter devolvió una respuesta vacía");
  return texto.trim();
}

export async function responder(env: Env, sistema: string, historial: Turno[], texto: string): Promise<{ texto: string; pasarAHumano: boolean }> {
  const respuesta = await preguntar(env, env.MODELO_TEXTO, [
    { role: "system", content: sistema },
    ...historial.map((t) => ({ role: t.rol, content: t.texto })),
    { role: "user", content: texto },
  ]);
  const pasarAHumano = respuesta.startsWith(MARCA_HUMANO);
  return { texto: pasarAHumano ? respuesta.slice(MARCA_HUMANO.length).trim() : respuesta, pasarAHumano };
}

// Convierte una nota de voz de WhatsApp (ogg) en texto. null si no se pudo.
export async function transcribir(env: Env, audio: ArrayBuffer): Promise<string | null> {
  try {
    return await preguntar(env, env.MODELO_AUDIO, [
      {
        role: "user",
        content: [
          { type: "text", text: "Transcribe este audio en español tal cual se dice. Devuelve sólo la transcripción." },
          { type: "input_audio", input_audio: { data: aBase64(audio), format: "ogg" } },
        ],
      },
    ]);
  } catch {
    return null;
  }
}

function aBase64(datos: ArrayBuffer): string {
  let binario = "";
  const bytes = new Uint8Array(datos);
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}
