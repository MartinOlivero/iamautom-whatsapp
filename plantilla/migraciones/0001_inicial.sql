-- Eventos ya procesados: evita contestar dos veces si Zernio reintenta.
CREATE TABLE IF NOT EXISTS eventos (id TEXT PRIMARY KEY, creado INTEGER NOT NULL);
-- Historial de cada charla (la "memoria" del bot con cada cliente).
CREATE TABLE IF NOT EXISTS mensajes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  charla TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('user', 'assistant')),
  texto TEXT NOT NULL,
  creado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS mensajes_por_charla ON mensajes (charla, id);
-- Charlas que atiende una persona: el bot no habla hasta "pausada_hasta".
CREATE TABLE IF NOT EXISTS charlas (charla TEXT PRIMARY KEY, pausada_hasta INTEGER);
