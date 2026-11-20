// Punto de entrada del bot. Cloudflare llama a fetch() con cada pedido que llega.

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
    return new Response("No encontrado", { status: 404 });
  },
};
