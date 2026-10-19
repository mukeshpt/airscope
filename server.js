/* AirScope — tiny zero-dependency static file server.
 * Usage:  node server.js   →  http://localhost:5173
 * (index.html also works by double-clicking it — this is just nicer.)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400);
      return res.end('Bad request');
    }

    let file = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    fs.stat(file, (err, stat) => {
      if (err || stat.isDirectory()) file = path.join(ROOT, 'index.html');
      fs.readFile(file, (readErr, buf) => {
        if (readErr) {
          res.writeHead(404);
          return res.end('Not found');
        }
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
        });
        res.end(buf);
      });
    });
  })
  .listen(PORT, () => {
    console.log(`AirScope is running →  http://localhost:${PORT}`);
  });
