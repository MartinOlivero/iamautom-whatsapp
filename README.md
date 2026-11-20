<p align="center">
  <img src="docs/assets/portada.jpg" alt="iamautom WhatsApp: tu bot de WhatsApp con IA, gratis" width="100%">
</p>

# iamautom WhatsApp

**Tu bot de WhatsApp con IA, atendiendo a tus clientes. Sin programar y sin pagar hosting.**

Es un plugin de [Claude Code](https://claude.com/claude-code). Le escribes `/crear-bot` y Claude te guía paso a paso:
te pregunta por tu negocio, lee tu menú o lista de precios, arma el bot, lo prueba contigo y lo deja
funcionando en tu propio WhatsApp Business. Gratis y de código abierto.

## Qué hace tu bot

- **Responde con la información de tu negocio**: horarios, precios, catálogo, envíos, preguntas frecuentes.
- **Entiende notas de voz**, no sólo texto.
- **No inventa.** Si un dato no está en lo que le diste, lo dice y ofrece pasar con una persona.
- **Te pasa la conversación** cuando el cliente pide hablar con alguien, y deja de responder en esa charla.
- **Se calla si contestas tú** desde tu celular. Vuelve solo después de 12 horas.
- **Recuerda cada conversación**, para que el cliente no tenga que repetir todo.
- Sigues usando la app **WhatsApp Business** en tu celular como siempre: el bot atiende al mismo tiempo.

## Qué necesitas

- [Claude Code](https://claude.com/claude-code) instalado.
- [Node.js](https://nodejs.org) 18 o más reciente (la versión LTS).
- Tu número en la app **WhatsApp Business** (no el WhatsApp común).
- Cuentas gratuitas en **OpenRouter** (la IA), **Cloudflare** (donde vive el bot) y **Zernio** (la conexión con WhatsApp).
  Si no las tienes, las creas durante el recorrido.

## Instalación

En Claude Code:

```
/plugin marketplace add MartinOlivero/iamautom-whatsapp
/plugin install iamautom-whatsapp
```

Después escribe:

```
/crear-bot
```

Y sigue lo que te va diciendo. Para cambiar precios, horarios o el menú más adelante: `/actualizar-bot`.

## Cuánto cuesta

| Qué | Costo |
|---|---|
| Esta herramienta | **Gratis** (licencia MIT) |
| Hosting del bot (Cloudflare Workers + D1) | **Gratis**: el plan gratuito permite uso comercial y hasta 100.000 mensajes por día |
| Probar el bot | **Gratis**, con los modelos gratuitos de OpenRouter |
| La IA atendiendo clientes reales | Pagas sólo lo que usas. Con **US$ 10 de crédito** en OpenRouter empiezas; cada respuesta cuesta fracciones de centavo. OpenRouter cobra 5,5 % al cargar crédito |
| Entender una nota de voz | Alrededor de **US$ 0,0003** por audio |
| Conexión con WhatsApp (Zernio) | **2 cuentas gratis** |
| Mensajes de WhatsApp (Meta) | Según la tarifa de Meta para tu país; las respuestas a clientes tienen un cupo gratuito por mes |

*Cifras verificadas el 20/11/2026. Las tarifas de cada servicio pueden cambiar.*

**Tus claves son tuyas.** La clave de la IA se crea en tu cuenta de OpenRouter con un tope de gasto que eliges tú,
y todo queda en tu computadora y en tu cuenta de Cloudflare. Esta herramienta no envía datos a nadie más.

## Qué no hace (todavía)

- No agenda turnos, no toma pedidos ni cobra.
- No ve fotos ni stickers: le pide al cliente que lo escriba.
- No tiene panel web: los cambios se hacen con `/actualizar-bot`.

## ¿Lo quieres más completo?

Turnos, pedidos, varias sucursales, conectado a tu sistema o a tu CRM: eso lo armamos en
**[iamautom](https://iamautom.com)**.

Más herramientas gratis como esta en YouTube, Instagram y TikTok: **[@tincho.olivero](https://www.youtube.com/@tincho.olivero)**.

---

Hecho por [Martín Olivero](https://iamautom.com) · Licencia [MIT](LICENSE)
