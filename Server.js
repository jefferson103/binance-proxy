const http = require("http");
const https = require("https");
const url = require("url");

const PROXY_TOKEN = process.env.PROXY_TOKEN || "";
const PORT = process.env.PORT || 10000;

if (!PROXY_TOKEN) {
  console.error("⚠️  PROXY_TOKEN no definido. El proxy no funcionará sin token.");
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-proxy-token");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health" || req.url === "/ping") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, time: Date.now() }));
    return;
  }

  if (req.url !== "/binance" || req.method !== "POST") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. Usa POST /binance" }));
    return;
  }

  const token = req.headers["x-proxy-token"];
  if (!PROXY_TOKEN || token !== PROXY_TOKEN) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Token inválido" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "JSON inválido" }));
      return;
    }

    const targetUrl = parsed.url;
    const method = (parsed.method || "GET").toUpperCase();
    const apiKey = parsed.apiKey || "";

    if (!targetUrl) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Falta 'url' en el body" }));
      return;
    }

    const target = url.parse(targetUrl);
    const options = {
      hostname: target.hostname,
      port: target.port || 443,
      path: target.path,
      method,
      headers: {
        "X-MBX-APIKEY": apiKey,
        "Content-Type": "application/json",
      },
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let data = "";
      proxyRes.on("data", (chunk) => { data += chunk; });
      proxyRes.on("end", () => {
        res.writeHead(proxyRes.statusCode || 502, { "Content-Type": "application/json" });
        res.end(data);
      });
    });

    proxyReq.on("error", (e) => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    });

    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`✅ Proxy Binance escuchando en puerto ${PORT}`);
});
