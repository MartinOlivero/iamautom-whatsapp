// La memoria del bot, guardada en la base D1 de Cloudflare.
// "charla" = el id de conversación de Zernio (uno por cliente).

export type Turno = { rol: "user" | "assistant"; texto: string };

// true la primera vez que vemos este evento; false si es un reintento repetido.
export async function marcarProcesado(db: D1Database, eventId: string): Promise<boolean> {
  const r = await db.prepare("INSERT OR IGNORE INTO eventos (id, creado) VALUES (?, ?)").bind(eventId, Date.now()).run();
  return r.meta.changes === 1;
}

export async function historial(db: D1Database, charla: string, limite = 20): Promise<Turno[]> {
  const { results } = await db
    .prepare("SELECT rol, texto FROM mensajes WHERE charla = ? ORDER BY id DESC LIMIT ?")
    .bind(charla, limite)
    .all<Turno>();
  return results.reverse();
}

export async function guardar(db: D1Database, charla: string, rol: Turno["rol"], texto: string): Promise<void> {
  await db.prepare("INSERT INTO mensajes (charla, rol, texto, creado) VALUES (?, ?, ?, ?)").bind(charla, rol, texto, Date.now()).run();
}

export async function pausadaHasta(db: D1Database, charla: string): Promise<number | null> {
  const fila = await db.prepare("SELECT pausada_hasta FROM charlas WHERE charla = ?").bind(charla).first<{ pausada_hasta: number | null }>();
  return fila?.pausada_hasta ?? null;
}

export async function pausar(db: D1Database, charla: string, hasta: number): Promise<void> {
  await db
    .prepare("INSERT INTO charlas (charla, pausada_hasta) VALUES (?, ?) ON CONFLICT (charla) DO UPDATE SET pausada_hasta = excluded.pausada_hasta")
    .bind(charla, hasta)
    .run();
}
