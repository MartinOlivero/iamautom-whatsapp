// Las reglas de qué hacer con cada mensaje. Es una función "pura": no toca la base ni la red,
// sólo decide. Así se puede probar cada regla por separado.
import type { Evento } from "./zernio";

export type Accion = "responder" | "transcribir" | "pedir_texto" | "pausar" | "silencio" | "nada";

export function decidir(evento: Evento, pausadaHasta: number | null, ahora: number): Accion {
  if (evento.tipo === "ignorar") return "nada";
  if (evento.tipo === "eco_dueno") return "pausar"; // el dueño tomó la charla
  if (pausadaHasta !== null && pausadaHasta > ahora) return "silencio";
  if (evento.texto.trim()) return "responder";
  if (evento.adjuntos.some((a) => a.tipo === "audio")) return "transcribir";
  return "pedir_texto"; // fotos, stickers, videos sin texto
}
