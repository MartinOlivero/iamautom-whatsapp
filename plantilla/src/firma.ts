// Verifica que un mensaje venga de verdad de Zernio.
// Analogía: Zernio "lacra" cada sobre con un sello que sólo se puede hacer con el secreto
// que compartimos. Si el sello no coincide, alguien falsificó el sobre y lo tiramos.

const codificador = new TextEncoder();

export async function verificarFirma(
  cuerpoCrudo: string,
  firma: string | null,
  secreto: string | undefined,
  modo: string | undefined,
): Promise<boolean> {
  // Sin secreto cargado: sólo se acepta en la compu del usuario (modo local).
  // En producción se rechaza todo: mejor un bot que no contesta que uno que cualquiera puede manejar.
  if (!secreto) return modo === "local";
  if (!firma) return false;

  const clave = await crypto.subtle.importKey("raw", codificador.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sello = new Uint8Array(await crypto.subtle.sign("HMAC", clave, codificador.encode(cuerpoCrudo)));
  const esperado = [...sello].map((b) => b.toString(16).padStart(2, "0")).join("");

  return iguales(esperado, firma.trim().toLowerCase());
}

// Comparación en tiempo constante: tarda lo mismo acierte o no, así nadie puede adivinar
// la firma letra por letra midiendo cuánto tarda la respuesta.
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}
