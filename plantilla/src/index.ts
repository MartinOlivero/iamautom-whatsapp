// Punto de entrada del bot. Cloudflare llama a fetch() con cada pedido que llega.
import { verificarFirma } from "./firma";
import { leerEvento } from "./zernio";
import { marcarProcesado, historial, guardar } from "./memoria";
import { responder } from "./cerebro";
import { procesar, sistema } from "./procesar";

export interface Env {
  DB: D1Database;
  MODO?: string; // "local" habilita el simulador y acepta mensajes sin firma
  ZERNIO_API_KEY: string;
  ZERNIO_WEBHOOK_SECRET?: string;
  OPENROUTER_API_KEY: string;
  MODELO_TEXTO: string;
  MODELO_AUDIO: string;
  HORAS_PAUSA?: string;
}

export default {
  async fetch(pedido: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(pedido.url);
    if (pedido.method === "GET" && url.pathname === "/") {
      return Response.json({ ok: true, bot: "iamautom-whatsapp" });
    }
    if (pedido.method === "POST" && url.pathname === "/webhook") return webhook(pedido, env, ctx);
    if (pedido.method === "POST" && url.pathname === "/simular" && env.MODO === "local") return simular(pedido, env);
    return new Response("No encontrado", { status: 404 });
  },
};

// Zernio nos avisa de cada mensaje acá. Orden importante:
// 1) verificar la firma, 2) anotar el evento ANTES de procesarlo (así un reintento no
// genera una segunda respuesta), 3) contestar "recibido" ya y trabajar en segundo plano.
async function webhook(pedido: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const cuerpo = await pedido.text();
  if (!(await verificarFirma(cuerpo, pedido.headers.get("X-Zernio-Signature"), env.ZERNIO_WEBHOOK_SECRET, env.MODO))) {
    return new Response("Firma inválida", { status: 401 });
  }
  let evento;
  try {
    evento = leerEvento(JSON.parse(cuerpo));
  } catch {
    return new Response("Evento inválido", { status: 400 });
  }
  if (evento.tipo === "ignorar" || !(await marcarProcesado(env.DB, evento.eventId))) return new Response("ok");
  ctx.waitUntil(procesar(env, evento).catch((e) => console.error("Error procesando", evento.eventId, e)));
  return new Response("ok");
}

// Chat de prueba en la compu del usuario: misma IA y mismas reglas, sin WhatsApp.
async function simular(pedido: Request, env: Env): Promise<Response> {
  const { telefono, texto } = (await pedido.json()) as { telefono: string; texto: string };
  const charla = `simulador:${telefono}`;
  const r = await responder(env, sistema, await historial(env.DB, charla), texto);
  await guardar(env.DB, charla, "user", texto);
  await guardar(env.DB, charla, "assistant", r.texto);
  return Response.json({ respuesta: r.texto, pasarAHumano: r.pasarAHumano });
}
