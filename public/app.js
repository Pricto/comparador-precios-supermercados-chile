// La página habla solo con /api/search y /api/compare; la API key queda en el servidor.

const TEXT = {
  es: {
    eyebrow: "Ejemplo · API de Pricto",
    title: "¿En qué supermercado sale más barata tu canasta?",
    lede: "Arma tu canasta y compara el precio de cada producto y el total en cada supermercado.",
    basket: "Tu canasta",
    search: "Busca un producto: leche, arroz, detergente…",
    empty: "Agrega productos con el buscador.",
    from: (price, n) => `desde ${price} en ${n} ${n === 1 ? "tienda" : "tiendas"}`,
    winner: "Canasta completa más barata",
    saves: (amount, store) => `${amount} menos que en ${store}`,
    missing: (n) => `${n === 1 ? "falta 1 producto" : `faltan ${n} productos`}`,
    split: (amount, saving) => `Comprando cada producto donde está más barato: ${amount}${saving ? ` (${saving} menos)` : ""}`,
    product: "Producto",
    total: "Total",
    nowhere: "ningún supermercado",
    remove: "Quitar",
    sample: "Datos de ejemplo de la sandbox: precios, códigos y URLs inventados.",
    price_note: "Precio normal, el que paga cualquiera: sin precio con tarjeta de la tienda ni promociones por cantidad.",
  },
  en: {
    eyebrow: "Example · Pricto API",
    title: "Which supermarket has your basket cheapest?",
    lede: "Build your basket and compare the price of every item and the total at each supermarket.",
    basket: "Your basket",
    search: "Search a product: milk, rice, detergent…",
    empty: "Add products with the search box.",
    from: (price, n) => `from ${price} at ${n} ${n === 1 ? "store" : "stores"}`,
    winner: "Cheapest complete basket",
    saves: (amount, store) => `${amount} less than at ${store}`,
    missing: (n) => `${n} ${n === 1 ? "item" : "items"} missing`,
    split: (amount, saving) => `Buying each item where it is cheapest: ${amount}${saving ? ` (${saving} less)` : ""}`,
    product: "Product",
    total: "Total",
    nowhere: "no supermarket",
    remove: "Remove",
    sample: "Sandbox sample data: prices, barcodes and URLs are made up.",
    price_note: "Regular price, what anyone pays: no store-card prices or multi-buy promotions.",
  },
};

// Canasta inicial por texto, para que funcione igual con la sandbox y con datos reales.
const STARTER = ["leche entera 1 litro", "arroz grado 1", "aceite vegetal 1 l", "spaghetti 5", "café instantáneo 170 g", "papel higiénico 12 rollos", "detergente líquido 3 l"];

const $ = (selector) => document.querySelector(selector);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let lang = localStorage.getItem("lang") ?? (navigator.language.startsWith("es") ? "es" : "en");
let basket = JSON.parse(localStorage.getItem("basket") ?? "null");
let currency = "CLP";
const t = (key) => TEXT[lang][key];
const money = (n) => new Intl.NumberFormat(lang === "es" ? "es-CL" : "en-US", { style: "currency", currency, currencyDisplay: lang === "es" ? "symbol" : "code", maximumFractionDigits: currency === "CLP" ? 0 : 2 }).format(n);

async function api(path, body) {
  const res = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  const json = await res.json();
  if (!res.ok) throw new Error([json.detail ?? json.title, json.hint].filter(Boolean).join(" "));
  return json;
}

function save() {
  localStorage.setItem("basket", JSON.stringify(basket));
  renderBasket();
  clearTimeout(save.timer);
  save.timer = setTimeout(compare, 250);
}

function renderBasket() {
  $("#items").innerHTML = basket.map((item, i) => `
    <li>
      <span class="name">${esc(item.name)}</span>
      <span class="qty">
        <button type="button" data-step="-1" data-i="${i}" aria-label="−1">−</button>
        <b>${item.quantity}</b>
        <button type="button" data-step="1" data-i="${i}" aria-label="+1">+</button>
        <button type="button" class="remove" data-remove="${i}" aria-label="${t("remove")}">×</button>
      </span>
    </li>`).join("");
  $("#empty").hidden = basket.length > 0;
}

async function compare() {
  $("#error").hidden = true;
  if (!basket.length) {
    $("#summary").innerHTML = $("#matrix").innerHTML = $("#source").textContent = "";
    return;
  }
  try {
    const { data, meta } = await api("/api/compare", { lang, items: basket.map(({ product_id, quantity }) => ({ product_id, quantity })) });
    currency = data.currency;
    // Los nombres vuelven en el idioma pedido.
    const names = new Map(data.items.map((row) => [row.product.id, row.product.name]));
    basket.forEach((item) => (item.name = names.get(item.product_id) ?? item.name));
    localStorage.setItem("basket", JSON.stringify(basket));
    renderBasket();
    renderResult(data);
    $("#sample").hidden = !meta.warnings?.some((w) => w.startsWith("synthetic_data"));
    $("#source").textContent = meta.attribution.text;
  } catch (e) {
    $("#error").textContent = e.message;
    $("#error").hidden = false;
  }
}

function renderResult({ items, totals }) {
  const stores = totals.map((x) => x.retailer);
  const complete = totals.filter((x) => x.complete);
  const best = complete[0];
  const worst = complete.at(-1);
  const max = Math.max(...totals.map((x) => x.total));

  const mins = items.map((row) => Math.min(...stores.map((s) => row.prices[s.id] ?? Infinity)));
  const split = items.reduce((sum, row, i) => sum + (Number.isFinite(mins[i]) ? mins[i] * row.quantity : 0), 0);

  $("#summary").innerHTML = `
    ${best ? `<div class="winner">
      <span class="eyebrow">${t("winner")}</span>
      <div class="winner-row"><b>${esc(best.retailer.name)}</b><span class="big">${money(best.total)}</span></div>
      ${worst && worst !== best ? `<span class="dim">${t("saves")(money(worst.total - best.total), esc(worst.retailer.name))}</span>` : ""}
    </div>` : ""}
    <ul class="bars">${totals.map((x) => `
      <li class="${x.complete ? "" : "incomplete"} ${x === best ? "best" : ""}">
        <span>${esc(x.retailer.name)}</span>
        <span class="bar"><span style="width:${(x.total / max) * 100}%"></span></span>
        <span class="num">${money(x.total)}</span>
        <span class="dim">${x.complete ? "" : t("missing")(items.length - x.items_found)}</span>
      </li>`).join("")}
    </ul>
    <p class="split">${t("split")(money(split), best && split < best.total ? money(best.total - split) : "")}</p>`;

  $("#matrix").innerHTML = `
    <thead><tr><th>${t("product")}</th>${stores.map((s) => `<th class="num">${esc(s.name)}</th>`).join("")}</tr></thead>
    <tbody>${items.map((row, i) => `
      <tr><td>${esc(row.product.name)}${row.quantity > 1 ? ` <span class="dim">× ${row.quantity}</span>` : ""}
        ${Number.isFinite(mins[i]) ? "" : `<span class="dim">· ${t("nowhere")}</span>`}</td>
        ${stores.map((s) => {
          const price = row.prices[s.id];
          return price == null ? `<td class="num dim">—</td>` : `<td class="num ${price === mins[i] ? "min" : ""}">${money(price)}</td>`;
        }).join("")}
      </tr>`).join("")}
    </tbody>
    <tfoot><tr><th>${t("total")}</th>${totals.map((x) => `<th class="num">${money(x.total)}${x.complete ? "" : "*"}</th>`).join("")}</tr></tfoot>`;
}

let searchTimer;
$("#q").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  const q = e.target.value.trim();
  if (q.length < 2) return ($("#results").hidden = true);
  searchTimer = setTimeout(async () => {
    const { data } = await api(`/api/search?${new URLSearchParams({ q, lang })}`).catch(() => ({ data: [] }));
    $("#results").innerHTML = data.map((p) => `
      <li><button type="button" data-id="${esc(p.id)}" data-name="${esc(p.name)}">
        <span>${esc(p.name)}</span>
        <span class="dim">${p.price_summary ? t("from")(money(p.price_summary.min), p.price_summary.retailers_count) : ""}</span>
      </button></li>`).join("");
    $("#results").hidden = !data.length;
  }, 200);
});

$("#results").addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (!button) return;
  const found = basket.find((x) => x.product_id === button.dataset.id);
  if (found) found.quantity++;
  else basket.push({ product_id: button.dataset.id, name: button.dataset.name, quantity: 1 });
  $("#results").hidden = true;
  $("#q").value = "";
  save();
});

$("#items").addEventListener("click", (e) => {
  const { step, i, remove } = e.target.dataset;
  if (remove !== undefined) basket.splice(Number(remove), 1);
  else if (step) basket[i].quantity = Math.max(1, Math.min(99, basket[i].quantity + Number(step)));
  else return;
  save();
});

document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => {
  lang = b.dataset.lang;
  localStorage.setItem("lang", lang);
  applyLang();
  compare();
}));

function applyLang() {
  document.documentElement.lang = lang;
  document.title = t("title");
  document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  $("#q").placeholder = t("search");
  document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.lang === lang));
}

applyLang();
if (!basket) {
  basket = [];
  for (const q of STARTER) {
    const { data } = await api(`/api/search?${new URLSearchParams({ q, lang })}`).catch(() => ({ data: [] }));
    if (data[0]) basket.push({ product_id: data[0].id, name: data[0].name, quantity: q.startsWith("leche") ? 2 : 1 });
  }
}
save();
