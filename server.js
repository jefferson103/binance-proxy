const express = require("express");
const app = express();
app.use(express.json({ limit: "1mb" }));
const PROXY_TOKEN = process.env.PROXY_TOKEN;

app.post("/binance", async (req, res) => {
  if (req.headers["x-proxy-token"] !== PROXY_TOKEN) return res.status(401).json({ error: "Unauthorized" });
  const { method, url, apiKey } = req.body;
  if (!url || !apiKey) return res.status(400).json({ error: "Faltan url o apiKey" });
  try {
    const r = await fetch(url, { method: method || "GET", headers: { "X-MBX-APIKEY": apiKey } });
    const text = await r.text();
    res.status(r.status).type("application/json").send(text);
  } catch (e) { res.status(502).json({ error: e.message }); }
});
