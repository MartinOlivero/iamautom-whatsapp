// Conexión con Zernio (el puente entre WhatsApp y el bot).
// Lee la clave ZERNIO_API_KEY de <carpeta>/.dev.vars.
//
//   node zernio.mjs sandbox  <telefono> --carpeta <ruta>   prueba gratis con el número compartido de Zernio
//   node zernio.mjs conectar             --carpeta <ruta>   abre la conexión de TU WhatsApp Business
//   node zernio.mjs webhook  <url-bot>   --carpeta <ruta>   le dice a Zernio adónde mandar los mensajes
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { guardarVariable, leerVariable } from "./lib/dev-vars.mjs";
import { abrir } from "./lib/abrir.mjs";

const API = "https://zernio.com/api/v1";

// ── Armado de pedidos (funciones puras, testeadas) ─────────────────────────
export function pedidoWebhook(urlBot, secreto) {
  const base = urlBot.replace(/\/+$/, "").replace(/\/webhook$/, "");
  return {
    metodo: "POST",
    ruta: "/webhooks/settings",
    cuerpo: { name: "iamautom-whatsapp", url: `${base}/webhook`, secret: secreto, events: ["message.received", "message.sent"] },
  };
}

export function pedidoSandbox(telefono) {
  return { metodo: "POST", ruta: "/whatsapp/sandbox/sessions", cuerpo: { phone: `+${telefono.replace(/\D/g, "")}` } };
}

export function pedidoConectar(profileId) {
  // Sin "onboarding": Zernio usa coexistencia por defecto (el dueño sigue usando su app).
  return { metodo: "GET", ruta: `/connect/whatsapp?profileId=${encodeURIComponent(profileId)}` };
}

// ── Ejecución ──────────────────────────────────────────────────────────────
async function llamar(clave, { metodo, ruta, cuerpo }) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Zernio respondió ${r.status}: ${datos.error ?? JSON.stringify(datos)}`);
  return datos;
}

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function principal() {
  const args = process.argv.slice(2);
  const i = args.indexOf("--carpeta");
  const carpeta = i >= 0 ? args.splice(i, 2)[1] : undefined;
  const [comando, valor] = args;
  if (!carpeta || !comando) {
    console.error("Uso: node zernio.mjs <sandbox|conectar|webhook> [valor] --carpeta <ruta-del-bot>");
    process.exit(1);
  }
  const clave = await leerVariable(carpeta, "ZERNIO_API_KEY");
  if (!clave) {
    console.error("No encuentro ZERNIO_API_KEY en .dev.vars. Primero cargá tu clave de Zernio.");
    process.exit(1);
  }

  if (comando === "sandbox") {
    const r = await llamar(clave, pedidoSandbox(valor));
    console.log(`Te llegó un WhatsApp del número de prueba de Zernio (${r.sandboxNumber}). Respondelo con cualquier cosa.`);
    for (let intento = 0; intento < 60; intento++) {
      await esperar(5000);
      const { sessions } = await llamar(clave, { metodo: "GET", ruta: "/whatsapp/sandbox/sessions" });
      if (sessions?.some((s) => s.status === "active")) {
        console.log(`Listo: tu celular quedó activado. Escribile al ${r.sandboxNumber} para hablar con tu bot.`);
        return;
      }
    }
    throw new Error("Pasaron 5 minutos y la prueba no se activó. ¿Respondiste el mensaje?");
  }

  if (comando === "conectar") {
    // ponytail: usa el primer perfil de la cuenta; la mayoría de los usuarios tiene uno solo.
    const perfiles = await llamar(clave, { metodo: "GET", ruta: "/profiles" });
    const perfil = (perfiles.profiles ?? perfiles.data ?? [])[0];
    const profileId = perfil?._id ?? perfil?.id;
    if (!profileId) throw new Error("Tu cuenta de Zernio no tiene perfiles. Creá uno desde zernio.com.");
    const { authUrl } = await llamar(clave, pedidoConectar(profileId));
    console.log("Se abrió tu navegador. Seguí los pasos de Meta y escaneá el QR con la app WhatsApp Business.");
    console.log(`Si no se abrió, copiá este link:\n${authUrl}`);
    abrir(authUrl);
    return;
  }

  if (comando === "webhook") {
    const secreto = randomBytes(32).toString("hex");
    const p = pedidoWebhook(valor, secreto);
    await llamar(clave, p);
    await guardarVariable(carpeta, "ZERNIO_WEBHOOK_SECRET", secreto);
    console.log(`Listo: Zernio va a mandar los mensajes a ${p.cuerpo.url}. El secreto quedó guardado en .dev.vars.`);
    return;
  }

  throw new Error(`Comando desconocido: ${comando}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
