# Comparador de precios de supermercados de Chile

[![Tests](https://github.com/Pricto/comparador-precios-supermercados-chile/actions/workflows/tests.yml/badge.svg)](https://github.com/Pricto/comparador-precios-supermercados-chile/actions/workflows/tests.yml)
[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-0f5a45.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Node%2022-0f5a45.svg)](package.json)
[![Datos: API de Pricto](https://img.shields.io/badge/datos-API%20de%20Pricto-b0401f.svg)](https://pricto.dev)

Arma una canasta y mira en qué supermercado de Chile sale más barata, con la API de precios de supermercados de [Pricto](https://pricto.dev): el precio de cada producto en Jumbo, Unimarc, Santa Isabel y los demás supermercados que cubre, el total por tienda y cuánto cuesta si compras cada producto donde está más barato. Una página estática y dos funciones en TypeScript, sin dependencias en producción.

[In English](#in-english) · [Docs de la API](https://pricto.dev/docs) · [Cobertura](https://pricto.dev/cobertura) · [Crear cuenta gratis](https://pricto.dev/registro)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FPricto%2Fcomparador-precios-supermercados-chile)

![Comparador con siete productos en tres supermercados y la canasta más barata destacada](docs/comparator-es.png)

## Pruébalo en local

Requiere Node 22 o superior. No necesitas cuenta: sin `PRICTO_API_KEY`, usa la sandbox pública de Pricto (`sk_test_sandbox`), que responde con datos de ejemplo.

```bash
git clone https://github.com/Pricto/comparador-precios-supermercados-chile && cd comparador-precios-supermercados-chile
npm install && npm start      # http://localhost:3000
```

La primera vez arma una canasta de ejemplo (leche, arroz, aceite, fideos, café, papel higiénico y detergente) buscándola por texto, así que funciona igual con la sandbox y con datos reales. La canasta se guarda en el navegador.

## Qué supermercados compara

Los que devuelve `GET /v1/retailers?segment=supermarket`: la lista no está fija en el código, así que una cadena nueva aparece sola. En [pricto.dev/cobertura](https://pricto.dev/cobertura) figuran como supermercados en captura diaria (registro de fuentes al 24-10-2026) Jumbo, Santa Isabel, Unimarc, Alvi, Mayorista Nacional, Supermercado La Herradura, Supermercados José González, Alimentika, Compras Aqui y Distribuidora Fermarket.

No compara Líder, Tottus, Superbodega aCuenta ni Central Mayorista: bloquean a los robots que se identifican o no responden. La sandbox trae datos inventados de Jumbo, Santa Isabel y Unimarc; los precios reales se ven con una [cuenta gratis](https://pricto.dev/registro).

## Despliégalo en Vercel

El botón de arriba clona el repo en tu cuenta y lo despliega. Funciona sin configurar nada (con la sandbox); para datos reales, agrega `PRICTO_API_KEY` en Project → Settings → Environment Variables y vuelve a desplegar.

| Variable | Para qué | Por omisión |
|---|---|---|
| `PRICTO_API_KEY` | Tu API key ([crear cuenta gratis](https://pricto.dev/registro)). Vive solo en el servidor: el navegador nunca la ve. | `sk_test_sandbox` (datos de ejemplo) |
| `PRICTO_API_URL` | Otra instancia de la API | `https://pricto.dev` |
| `PORT` | Puerto del servidor local | `3000` |

## Cómo funciona

```
public/          index.html, app.js y style.css: la interfaz, en español e inglés
api/search.ts    GET  /api/search?q=   → GET  /v1/products/search
api/compare.ts   POST /api/compare     → GET  /v1/retailers?segment=supermarket
                                          POST /v1/prices/compare  (solo esos supermercados)
lib/api.ts       agrega la key, reintenta los 429 según Retry-After y devuelve los errores tal cual
server.ts        servidor local con los mismos handlers que Vercel corre en api/
```

[`POST /v1/prices/compare`](https://pricto.dev/docs/api/compare-prices) hace casi todo el trabajo: devuelve el precio de cada producto en cada tienda y el total por tienda, con las canastas completas primero y la más barata arriba. La página solo calcula la compra dividida (cada producto donde está más barato) y destaca el mínimo de cada fila.

```bash
curl -X POST https://pricto.dev/v1/prices/compare \
  -H "Authorization: Bearer sk_test_sandbox" -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":"prd_01colu","quantity":2},{"product_id":"prd_09mira"}],
       "retailers":["cl-jumbo","cl-santaisabel","cl-unimarc"]}'
```

Los precios son `price`, lo que paga cualquier persona. La API trae aparte el precio con tarjeta de la tienda (`card_price`, que `compare` puede totalizar con `price_type: "card_price"`) y las promociones por cantidad; este ejemplo no las usa.

Cuánto cuesta con una key real: 1 crédito por cada precio de la matriz (producto × tienda con dato) y 1 por cada búsqueda; repetir la misma consulta dentro de 24 horas es gratis. Cada respuesta informa lo cobrado en `meta.credits_charged`. Planes en [pricto.dev/precios](https://pricto.dev/precios).

## Pregúntale a tu agente

La misma comparación está en el servidor MCP de Pricto (`compare_prices`), así que un agente la hace sin código. Conéctalo a la sandbox, sin login:

```bash
claude mcp add --transport http pricto https://pricto.dev/mcp/sandbox
```

Otros clientes (Cursor, VS Code, ChatGPT, claude.ai) en [pricto.dev/docs/mcp](https://pricto.dev/docs/mcp). Preguntas que responde con los datos de la sandbox:

- ¿En qué supermercado sale más barata esta lista: 2 leches Colun de 1 litro, arroz Miraflores de 1 kg, aceite Chef de 1 litro y café Nescafé Tradición de 170 g?
- Compara el precio del papel higiénico Confort de 12 rollos en Jumbo, Unimarc y Santa Isabel.
- ¿Cuánto me ahorro si compro cada producto de esta lista donde está más barato, en vez de todo en un solo supermercado?
- ¿Qué supermercados tiene Pricto y desde cuándo hay historial?

## Tests

Corren contra la sandbox pública:

```bash
npm test
npm run typecheck
```

`PRICTO_API_URL=http://localhost:8787 npm test` los corre contra una instancia local.

## Preguntas frecuentes

**¿Cómo comparo precios de Jumbo, Unimarc y Santa Isabel?**
Corre este comparador (`npm install && npm start`) o llama a `POST /v1/prices/compare` de la API de Pricto con tu lista de productos: responde el precio de cada producto en cada supermercado y el total por tienda.

**¿Hay una API de precios de supermercados en Chile?**
Sí. [Pricto](https://pricto.dev) entrega por API REST y por MCP los precios de supermercados y farmacias de Chile, con el mismo producto reconocido entre cadenas, la hora y la URL de cada precio. Tiene una sandbox pública para probar sin cuenta.

**¿Incluye Líder y Tottus?**
No: bloquean a los robots que se identifican. Si una cadena entrega un feed o un permiso, entra a la cobertura. El detalle está en [pricto.dev/cobertura](https://pricto.dev/cobertura).

**¿Los precios son de la tienda física o del sitio web?**
Del sitio web de cada cadena: son los precios online públicos, capturados a diario.

**¿Los precios de la sandbox son reales?**
No: son datos de ejemplo con nombres reales de tiendas y marcas. Con una cuenta gratis (100 créditos al mes, sin tarjeta) ves los precios reales.

**¿Lo puedo publicar como mi propia app?**
Sí, es MIT. Si usas datos reales, deja la key en el servidor (como hace este ejemplo) y muestra la línea de fuente que entrega la API (`meta.attribution.text`), con la tienda y la hora de cada precio.

## In English

Build a basket and see which Chilean supermarket (Jumbo, Unimarc, Santa Isabel and the others covered) has it cheapest, item by item and in total, with the [Pricto](https://pricto.dev) supermarket price API. A static page plus two TypeScript functions, deployable to Vercel, working out of the box with the public sandbox:

```bash
git clone https://github.com/Pricto/comparador-precios-supermercados-chile && cd comparador-precios-supermercados-chile
npm install && npm start
```

Full documentation in English: [README.en.md](README.en.md). API docs at [pricto.dev/docs](https://pricto.dev/docs).

## Licencia

Código bajo [MIT](LICENSE). Las fuentes Host Grotesk y Geist Mono van incluidas bajo la [SIL Open Font License 1.1](public/fonts/OFL.txt).
