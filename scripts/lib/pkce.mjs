// PKCE: un "código secreto de ida y vuelta" para que OpenRouter nos entregue la clave
// sólo a nosotros. Analogía: dejás la mitad de un billete roto en la ventanilla y
// sólo quien trae la otra mitad retira el paquete.
import { randomBytes, createHash } from "node:crypto";

export function crearVerificador() {
  return randomBytes(48).toString("base64url"); // 64 caracteres
}

export function desafio(verificador) {
  return createHash("sha256").update(verificador).digest("base64url");
}
