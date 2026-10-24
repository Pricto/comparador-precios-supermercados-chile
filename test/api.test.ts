// Corre contra la sandbox pública (sk_test_sandbox). PRICES_API_URL apunta a otra instancia.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { POST as compare } from "../api/compare.js";
import { GET as search } from "../api/search.js";
import { server } from "../server.js";

const post = (body: unknown) => new Request("http://x/api/compare", { method: "POST", body: JSON.stringify(body) });

test("search devuelve productos con su rango de precios", async () => {
  const res = await search(new Request("http://x/api/search?q=leche+entera&lang=es"));
  assert.equal(res.status, 200);
  const { data } = await res.json();
  assert.ok(data.length > 0);
  assert.ok(data[0].id.startsWith("prd_") && data[0].price_summary.min > 0);
});

test("compare: solo supermercados, total por tienda y la más barata primero", async () => {
  const found = await (await search(new Request("http://x/api/search?q=leche+entera"))).json();
  const id = found.data[0].id;
  const res = await compare(post({ items: [{ product_id: id, quantity: 2 }] }));
  assert.equal(res.status, 200);
  const { data, meta } = await res.json();
  assert.ok(data.totals.length > 0);
  const totals = data.totals.map((x: { total: number }) => x.total);
  assert.deepEqual(totals, [...totals].sort((a, b) => a - b));
  const row = data.items[0];
  const cheapest = Math.min(...Object.values(row.prices as Record<string, number | null>).filter((p) => p != null) as number[]);
  assert.equal(data.totals[0].total, cheapest * 2);
  assert.ok(meta.attribution.text.length > 0);
});

test("los errores de la API llegan al navegador con su código", async () => {
  const res = await compare(post({ items: [] }));
  assert.equal(res.status, 400);
  assert.ok((await res.json()).code);
});

test("el servidor local sirve la página y no sale de public/", async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  try {
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<script src="\/app.js"/);
    assert.equal((await fetch(`${base}/%2e%2e/package.json`)).status, 404);
  } finally {
    server.close();
  }
});
