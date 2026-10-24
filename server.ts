// Servidor local: los mismos handlers que Vercel corre en api/ y los archivos de public/.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { POST as compare } from "./api/compare.js";
import { GET as search } from "./api/search.js";

const routes: Record<string, (request: Request) => Promise<Response> | Response> = {
  "GET /api/search": search,
  "POST /api/compare": compare,
};
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml",
};
const PUBLIC = fileURLToPath(new URL("./public/", import.meta.url));

export const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const route = routes[`${req.method} ${url.pathname}`];
  let response: Response;
  if (route) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    response = await route(new Request(url, { method: req.method, body: chunks.length ? Buffer.concat(chunks) : undefined }));
  } else {
    const file = join(PUBLIC, normalize(url.pathname === "/" ? "/index.html" : url.pathname));
    const body = file.startsWith(PUBLIC) ? await readFile(file).catch(() => null) : null;
    response = body
      ? new Response(body, { headers: { "Content-Type": types[extname(file)] ?? "application/octet-stream" } })
      : new Response("Not found", { status: 404 });
  }
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`http://localhost:${port}`));
}
