const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

const BUSINESS_NUMBER = "353892490262"; // Número da empresa (para ignorar)

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

app.post("/send", (req, res) => {
  let { fbc, phone, name, message, fromMe, sender = {} } = req.body;

  // Pega número real da Z-API
  const senderPhone = sender.phone || phone;

  // Se não veio fbc, tenta extrair da mensagem
  if (!fbc && typeof message === "string") {
    try {
      const url = new URL(message);
      const param = url.searchParams.get("fbc");
      if (param) fbc = param;
    } catch {
      const match = message.match(/fb\.1\.[\w.-]+/);
      if (match) fbc = match[0];
    }
  }

  // Ignora se sender é a empresa ou fromMe for true
  if (
    senderPhone === BUSINESS_NUMBER ||
    phone === BUSINESS_NUMBER ||
    fromMe === true
  ) {
    console.log("⛔ Ignorado: mensagem enviada pela empresa:", { fbc, phone });
    return res.sendStatus(200);
  }

  if (!fbc || !fbc.startsWith("fb.") || !senderPhone) {
    console.log("⛔ Ignorado: dados incompletos ou inválidos:", { fbc, phone });
    return res.sendStatus(200);
  }

  console.log("✅ Lead recebido:", { fbc, phone: senderPhone, name });

  const logPath = path.join(__dirname, "tracker-fbc-log.json");
  let log = [];
  try {
    log = JSON.parse(fs.readFileSync(logPath, "utf8"));
  } catch {
    log = [];
  }

  const existing = log.find(entry => entry.fbc === fbc);
  if (existing) {
    if (senderPhone) existing.phone = senderPhone;
    if (name) existing.name = name;
  } else {
    log.unshift({
      fbc,
      phone: senderPhone || null,
      name: name || null,
      timestamp: new Date().toISOString()
    });
  }

  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  res.json({ saved: true });
});

// Envio manual (event-sent.html)
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
      phone,
      name: name || null,
      timestamp: new Date().toISOString()
    });
  }

  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  res.json({ saved: true });
});

app.use("/", express.static(__dirname));

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta " + PORT);
});
