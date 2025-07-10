const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

const EMPRESA_PHONE = '353892490262'; // número da Barbara Cleaning

// Libera CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

// Rota principal para rastreamento (usada por site e Z-API)
app.post("/send", (req, res) => {
  let { fbc, phone, name, message, sender } = req.body;

  // Tenta capturar o número real do cliente vindo da Z-API
  if (!phone && sender && sender.phone) {
    phone = sender.phone;
  }

  // Tenta extrair o fbc da URL ou texto, se não veio direto
  if (!fbc && typeof message === "string") {
    try {
      const url = new URL(message);
      const fbcParam = url.searchParams.get("fbc");
      if (fbcParam) fbc = fbcParam;
    } catch (e) {
      const match = message.match(/fb\.1\.[a-zA-Z0-9._-]+/);
      if (match) fbc = match[0];
    }
  }

  // Verificação final
  if (!fbc || !fbc.startsWith("fb.") || !phone) {
    return res.status(400).json({ error: "Dados incompletos" });
  }

  // Ignora se for o número da própria empresa
  if (phone === EMPRESA_PHONE) {
    console.log("⛔ Ignorado: tentativa de rastrear com número da empresa:", { fbc, phone });
    return res.json({ ignored: true });
  }

  console.log("✅ Lead recebido:", { fbc, phone, name });

  const logPath = path.join(__dirname, "tracker-fbc-log.json");
  let log = [];
  try {
    log = JSON.parse(fs.readFileSync(logPath, "utf8"));
  } catch {
    log = [];
  }

  const existing = log.find(entry => entry.fbc === fbc);
  if (existing) {
    if (phone) existing.phone = phone;
    if (name) existing.name = name;
  } else {
    log.unshift({
      fbc,
      phone: phone || null,
      name: name || null,
      timestamp: new Date().toISOString()
    });
  }

  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  res.json({ success: true });
});

// Rota manual (usada pelo tracker-event-sent.html)
app.post("/tracker-log-from-render.php", (req, res) => {
  let { fbc, phone, name } = req.body;

  if (!fbc || !fbc.startsWith("fb.") || !phone) {
    return res.status(400).json({ error: "Faltando fbc ou telefone" });
  }

  const logPath = path.join(__dirname, "tracker-fbc-log.json");
  let log = [];
  try {
    log = JSON.parse(fs.readFileSync(logPath, "utf8"));
  } catch {
    log = [];
  }

  const existing = log.find(entry => entry.fbc === fbc);
  if (existing) {
    if (phone) existing.phone = phone;
    if (name) existing.name = name;
  } else {
    log.unshift({
      fbc,
      phone: phone || null,
      name: name || null,
      timestamp: new Date().toISOString()
    });
  }

  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  res.json({ saved: true });
});

// Servir os arquivos HTML e JSON normalmente
app.use("/", express.static(__dirname));

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta " + PORT);
});
