import { callApi } from "../lib/api.js";

// GET /api/search?q=leche&lang=es → productos con su rango de precios entre tiendas.
export function GET(request: Request) {
  const url = new URL(request.url);
  const query = new URLSearchParams({ q: url.searchParams.get("q") ?? "", limit: "6", lang: url.searchParams.get("lang") ?? "es" });
  return callApi(`/products/search?${query}`);
}
