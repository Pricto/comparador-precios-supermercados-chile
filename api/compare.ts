import { callApi } from "../lib/api.js";

type Body = { items?: { product_id: string; quantity: number }[]; lang?: string };

// POST /api/compare {items, lang} → precio de cada producto en cada supermercado y el total por tienda.
export async function POST(request: Request) {
  const { items = [], lang = "es" }: Body = await request.json().catch(() => ({}));
  const supermarkets = await callApi("/retailers?segment=supermarket");
  if (!supermarkets.ok) return supermarkets;
  const retailers = (await supermarkets.json()).data.map((r: { id: string }) => r.id);
  return callApi(`/prices/compare?lang=${encodeURIComponent(lang)}`, {
    method: "POST",
    body: JSON.stringify({ items, retailers }),
  });
}
