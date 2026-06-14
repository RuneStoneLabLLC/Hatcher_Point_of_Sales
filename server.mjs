import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, resolve } from "node:path";
import { createServer } from "node:http";

const root = resolve("site");
const port = Number(process.env.PORT || 4321);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

function contentType(pathname) {
  const match = pathname.match(/\.[^.]+$/);
  return match ? types[match[0].toLowerCase()] || "application/octet-stream" : "text/html; charset=utf-8";
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const clean = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const target = resolve(join(root, clean));
  if (!target.startsWith(root)) return null;
  return target;
}

const server = createServer((request, response) => {
  const requested = safePath(request.url || "/");
  if (!requested) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  let filePath = requested;
  if (!existsSync(filePath)) {
    filePath = join(requested, "index.html");
  } else if (statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath) || !filePath.startsWith(root)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentType(filePath),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "SAMEORIGIN",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  });
  createReadStream(filePath)
    .on("error", () => {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Server error");
    })
    .pipe(response);
});

server.listen(port, "0.0.0.0", () => {
  if (process.env.NODE_ENV !== "production") {
    process.stderr.write(`Hatcher Supply site running at http://localhost:${port}\n`);
  }
});

setInterval(() => {}, 1 << 30);
