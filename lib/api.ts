// Llama a la API de precios desde el servidor, para que la key nunca llegue al navegador.

export const SANDBOX_KEY = "sk_test_sandbox";
const DEFAULT_URL = "https://mercali-platform.vercel.app";

export async function callApi(path: string, init: RequestInit = {}): Promise<Response> {
  const base = (process.env.PRICES_API_URL || DEFAULT_URL).replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${process.env.PRICES_API_KEY || SANDBOX_KEY}`,
    "Content-Type": "application/json",
    "User-Agent": "supermarket-comparator-example/0.1",
  };
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${base}/v1${path}`, { ...init, headers });
    if (res.status !== 429 || attempt === 3) {
      // Errores RFC 9457 incluidos: el navegador recibe el `code` y el `hint` tal cual.
      return new Response(res.body, { status: res.status, headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" } });
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * Number(res.headers.get("Retry-After") ?? 1)));
  }
}
