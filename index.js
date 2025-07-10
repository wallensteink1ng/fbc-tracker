const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

const EMPRESA_PHONE = "353892490262"; // Número oficial da empresa

// Libera CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

// Rota padrão de envio (Webhook Z-API ou invisível)
app.post("/send", (req, res) => {
  let { fbc, phone, name, message, sender } = req.body;

  // Detecta se veio da Z-API com sender.phone (prioritário)
  if (sender && sender.phone) {
    phone = sender.phone.toString();
  }

  // Ignora se o número é o da empresa (mesmo que fbc exista)
  if (phone === EMPRESA_PHONE) {
    console.log("⛔ Ignorado: mensagem enviada pela empresa:", { fbc, phone });
    return res.sendStatus(200);
  }

  // Tenta extrair fbc da URL da mensagem
  if (!fbc && typeof message === "string") {
    try {
      const url = new URL(message);
      const fbcParam = url.searchParams.get("fbc");
      if (fbcParam) fbc = fbcParam;
    } catch (e) {
      const match = message.match(/\.fbc\.(fb\.1\.[a-zA-Z0-9._-]+)/);
      if (match && match[1]) fbc = match[1];
    }
  }

  if (!fbc || !fbc.startsWith("fb.") || !phone) {
    console.log("⛔ Ignorado: dados incompletos ou inválidos:", { fbc, phone });
    return res.status(400).json({ error: "Dados incompletos" });
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

// Rota alternativa para envio manual (event-sent.html)
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

// Serve arquivos HTML e JSON diretamente
app.use("/", express.static(__dirname));

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta " + PORT);
});
