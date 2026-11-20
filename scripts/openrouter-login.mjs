// Conecta OpenRouter con un clic: abre el navegador, el usuario toca "Autorizar"
// y la clave llega sola a <carpeta>/.dev.vars. Nunca se muestra en pantalla.
//
// Uso: node openrouter-login.mjs --carpeta <ruta-del-bot> [--limite 5]
import { createServer } from "node:http";
import { crearVerificador, desafio } from "./lib/pkce.mjs";
import { guardarVariable } from "./lib/dev-vars.mjs";
import { abrir } from "./lib/abrir.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pares, v, i, todo) => (v.startsWith("--") ? [...pares, [v.slice(2), todo[i + 1]]] : pares), []),
);
const carpeta = args.carpeta;
const limite = Number(args.limite ?? 5);
if (!carpeta) {
  console.error("Falta --carpeta <ruta-del-bot>");
  process.exit(1);
}

const verificador = crearVerificador();
const DIEZ_MINUTOS = 10 * 60 * 1000;

const pagina = (titulo, texto) =>
  `<!doctype html><meta charset="utf-8"><title>${titulo}</title>
  <body style="font-family:system-ui;background:#1c1917;color:#f5f0e8;display:grid;place-items:center;height:100vh;margin:0">
  <div style="text-align:center;max-width:28rem"><h1 style="color:#c8743c">${titulo}</h1><p>${texto}</p></div>`;

const servidor = createServer(async (req, res) => {
  // Sólo atendemos a esta misma compu (el navegador del usuario).
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)) return res.writeHead(403).end();
  const url = new URL(req.url, "http://localhost");
  if (url.pathname !== "/callback") return res.writeHead(404).end();
  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" }).end(pagina("No se autorizó", "Volvé a la terminal y probá de nuevo."));
    return terminar(1, "OpenRouter no devolvió el código. ¿Cancelaste la autorización?");
  }
  try {
    const r = await fetch("https://openrouter.ai/api/v1/auth/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, code_verifier: verificador, code_challenge_method: "S256" }),
    });
    const datos = await r.json();
    if (!r.ok || !datos.key) throw new Error(`OpenRouter respondió ${r.status}`);
    await guardarVariable(carpeta, "OPENROUTER_API_KEY", datos.key);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(pagina("¡Listo!", "OpenRouter quedó conectado. Ya podés cerrar esta pestaña y volver a la terminal."));
    terminar(0, `Listo: OpenRouter conectado (tope de gasto: US$ ${limite}).`);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" }).end(pagina("Algo falló", "Volvé a la terminal y probá de nuevo."));
    terminar(1, `No se pudo obtener la clave: ${e.message}`);
  }
});

function terminar(codigo, mensaje) {
  (codigo ? console.error : console.log)(mensaje);
  servidor.close();
  process.exit(codigo);
}

// Puerto 0 = el sistema elige uno libre. Sin host fijo para atender "localhost" tanto
// por IPv4 como por IPv6 (según la compu, el navegador usa uno u otro).
servidor.listen(0, () => {
  const { port } = servidor.address();
  const auth = new URL("https://openrouter.ai/auth");
  auth.searchParams.set("callback_url", `http://localhost:${port}/callback`);
  auth.searchParams.set("code_challenge", desafio(verificador));
  auth.searchParams.set("code_challenge_method", "S256");
  auth.searchParams.set("limit", String(limite));
  auth.searchParams.set("key_label", "iamautom-whatsapp");
  console.log("Se abrió tu navegador. Entrá a OpenRouter y tocá «Authorize».");
  console.log(`Si no se abrió, copiá este link:\n${auth}`);
  abrir(auth.toString());
  setTimeout(() => terminar(1, "Pasaron 10 minutos sin autorizar. Volvé a correr el comando."), DIEZ_MINUTOS).unref();
});
