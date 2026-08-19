import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { buildSite } from "./build.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const META = resolve(ROOT, "src/content/site-meta.json");
const PORT = Number(process.env.PORT || 4173);
const TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"]
]);

const meta = JSON.parse(await readFile(META, "utf8"));
await buildSite({ requirePublication: process.argv.includes("--require-publication") });

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (url.pathname === "/thesis" || url.pathname === "/thesis/") {
      response.writeHead(302, { Location: meta.thesis_url });
      response.end();
      return;
    }
    const decoded = decodeURIComponent(url.pathname);
    let path = resolve(DIST, `.${decoded}`);
    if (path !== DIST && !path.startsWith(`${DIST}${sep}`)) {
      response.writeHead(400);
      response.end("Bad request");
      return;
    }
    let info;
    try {
      info = await stat(path);
    } catch {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    if (info.isDirectory()) path = resolve(path, "index.html");
    info = await stat(path);
    response.writeHead(200, {
      "Content-Type": TYPES.get(extname(path)) || "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": "no-store"
    });
    createReadStream(path).pipe(response);
  } catch (error) {
    response.writeHead(500);
    response.end("Preview server error");
    console.error(error);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Preview: http://127.0.0.1:${PORT}/`);
});
