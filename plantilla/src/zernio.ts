// Todo lo que habla con Zernio: leer lo que nos manda y responderle.
// Analogía: Zernio es el cartero entre WhatsApp y el bot. Este archivo abre sus sobres
// (leerEvento) y le entrega las respuestas (enviarTexto).

import type { Env } from "./index";

const API = "https://zernio.com/api/v1";

export type Adjunto = { tipo: "audio" | "image" | "video" | "file" | "sticker" | "share"; url: string; notaDeVoz: boolean };

export type Evento =
  | { tipo: "entrante"; eventId: string; conversationId: string; accountId: string; telefono: string; texto: string; adjuntos: Adjunto[] }
  | { tipo: "eco_dueno"; eventId: string; conversationId: string }
  | { tipo: "ignorar"; eventId: string };

export function leerEvento(payload: any): Evento {
  const eventId = payload?.id;
  if (typeof eventId !== "string" || !eventId) throw new Error("Evento de Zernio sin id");
  const m = payload.message;
  const ignorar: Evento = { tipo: "ignorar", eventId };
  if (!m || m.platform !== "whatsapp" || payload.metadata?.standby) return ignorar;

  if (payload.event === "message.received" && m.direction === "incoming") {
    return {
      tipo: "entrante",
      eventId,
      conversationId: m.conversationId,
      // ponytail: la forma de "account" no está documentada; se prueban los nombres probables.
      accountId: payload.account?.id ?? payload.account?._id ?? payload.account?.accountId,
      telefono: m.sender?.phoneNumber ?? m.sender?.id,
      texto: m.text ?? "",
      adjuntos: (m.attachments ?? []).map((a: any) => ({ tipo: a.type, url: a.url, notaDeVoz: a.payload?.voice === true })),
    };
  }
  // El dueño escribió desde la app WhatsApp Business de su celular (coexistencia).
  if (payload.event === "message.sent" && m.source === "whatsapp_business_app") {
    return { tipo: "eco_dueno", eventId, conversationId: m.conversationId };
  }
  return ignorar;
}

export async function enviarTexto(env: Env, conversationId: string, accountId: string, texto: string, claveIdempotencia: string): Promise<void> {
  const r = await fetch(`${API}/inbox/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.ZERNIO_API_KEY}`,
      "Content-Type": "application/json",
      // Si Zernio recibe dos veces la misma clave, no manda el mensaje dos veces.
      "Idempotency-Key": claveIdempotencia,
    },
    body: JSON.stringify({ accountId, message: texto }),
  });
  if (!r.ok) throw new Error(`Zernio respondió ${r.status} al enviar: ${await r.text()}`);
}

// Baja un audio o archivo. Devuelve null si ya no está disponible (Meta lo borra después de un tiempo).
export async function bajarAdjunto(env: Env, url: string): Promise<ArrayBuffer | null> {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${env.ZERNIO_API_KEY}` } });
  return r.ok ? r.arrayBuffer() : null;
}
