// Qué pasa con cada mensaje después de que ya le contestamos "recibido" a Zernio.
// Corre "en segundo plano" (ctx.waitUntil), con hasta 30 segundos para terminar.

import type { Env } from "./index";
import { type Evento, enviarTexto, bajarAdjunto } from "./zernio";
import { decidir } from "./decidir";
import { historial, guardar, pausadaHasta, pausar } from "./memoria";
import { armarSistema, responder, transcribir, type Negocio } from "./cerebro";
import negocio from "../config/negocio.json";
import conocimiento from "../config/conocimiento.md";

export const TEXTO_FALLA_IA = "En un momento te responde una persona del equipo.";
export const TEXTO_FOTO = "Por ahora no puedo ver fotos ni stickers. ¿Me lo puedes escribir?";
export const TEXTO_AUDIO_FALLIDO = "No pude escuchar el audio. ¿Me lo puedes escribir?";

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

  try {
    let texto = evento.texto;
    if (accion === "transcribir") {
      const audio = evento.adjuntos.find((a) => a.tipo === "audio")!;
      const datos = await bajarAdjunto(env, audio.url);
      const transcripcion = datos && (await transcribir(env, datos));
      if (!transcripcion) return await enviar(TEXTO_AUDIO_FALLIDO);
      texto = transcripcion;
    }

    const r = await responder(env, sistema, await historial(env.DB, charla), texto);
    await enviar(r.texto);
    await guardar(env.DB, charla, "user", texto);
    await guardar(env.DB, charla, "assistant", r.texto);
    if (r.pasarAHumano) await pausar(env.DB, charla, ahora + horasPausa(env));
  } catch (e) {
    // Algo falló (IA sin crédito o caída, demora, red, Zernio): el cliente no queda en silencio y
    // la charla pasa a una persona. Primero se pausa, así queda pausada aunque el aviso no salga.
    console.error("Falló el procesamiento:", e);
    await pausar(env.DB, charla, ahora + horasPausa(env));
    try {
      await enviar(TEXTO_FALLA_IA);
    } catch (e2) {
      console.error("Tampoco se pudo avisar al cliente:", e2);
    }
  }
}
