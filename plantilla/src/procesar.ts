// Qué pasa con cada mensaje después de que ya le contestamos "recibido" a Zernio.
// Corre "en segundo plano" (ctx.waitUntil), con hasta 30 segundos para terminar.

import type { Env } from "./index";
import { type Evento, enviarTexto, bajarAdjunto } from "./zernio";
import { decidir } from "./decidir";
import { historial, guardar, pausadaHasta, pausar } from "./memoria";
import { armarSistema, responder, transcribir, type Negocio } from "./cerebro";
import negocio from "../config/negocio.json";
import conocimiento from "../config/conocimiento.md";

export const TEXTO_FALLA_IA = "En un ratito te responde una persona del equipo.";
export const TEXTO_FOTO = "Por ahora no puedo ver fotos ni stickers. ¿Me lo escribís?";
export const TEXTO_AUDIO_FALLIDO = "No pude escuchar el audio. ¿Me lo escribís?";

export const sistema = armarSistema(negocio as Negocio, conocimiento);

export function horasPausa(env: Env): number {
  return (Number(env.HORAS_PAUSA) || 12) * 3600e3;
}

export async function procesar(env: Env, evento: Evento): Promise<void> {
  if (evento.tipo === "ignorar") return;
  const charla = evento.conversationId;
  const ahora = Date.now();
  const accion = decidir(evento, await pausadaHasta(env.DB, charla), ahora);

  if (accion === "pausar") return pausar(env.DB, charla, ahora + horasPausa(env));
  if (evento.tipo !== "entrante" || accion === "silencio" || accion === "nada") return;

  const enviar = (texto: string) => enviarTexto(env, charla, evento.accountId, texto, evento.eventId);
  if (accion === "pedir_texto") return enviar(TEXTO_FOTO);

  let texto = evento.texto;
  if (accion === "transcribir") {
    const audio = evento.adjuntos.find((a) => a.tipo === "audio")!;
    const datos = await bajarAdjunto(env, audio.url);
    const transcripcion = datos && (await transcribir(env, datos));
    if (!transcripcion) return enviar(TEXTO_AUDIO_FALLIDO);
    texto = transcripcion;
  }

  let r;
  try {
    r = await responder(env, sistema, await historial(env.DB, charla), texto);
  } catch (e) {
    // Sin IA (sin crédito, caída, etc.): el cliente no queda en silencio y la charla pasa a una persona.
    console.error("Falló la IA:", e);
    await enviar(TEXTO_FALLA_IA);
    return pausar(env.DB, charla, ahora + horasPausa(env));
  }

  await enviar(r.texto);
  await guardar(env.DB, charla, "user", texto);
  await guardar(env.DB, charla, "assistant", r.texto);
  if (r.pasarAHumano) await pausar(env.DB, charla, ahora + horasPausa(env));
}
