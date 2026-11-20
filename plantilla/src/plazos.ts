// Plazos máximos (ms) de cada pedido externo. Cloudflare corta el trabajo en segundo plano
// a los ~30 s: la suma tiene que quedar por debajo para que siempre llegue el aviso de respaldo.
export const PLAZOS = { bajarAudio: 8000, transcribir: 10000, responder: 10000 };
