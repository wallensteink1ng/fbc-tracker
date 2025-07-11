const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 10000;

const EMPRESA_PHONE = "353892490262";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

// 🚀 Rota padrão invisível ou Z-API
app.post("/send", (req, res) => {
  let { fbc, phone, name, sender, message } = req.body;

  if (sender && sender.phone && sender.phone === EMPRESA_PHONE) {
    console.log("⛔ Ignorado: mensagem enviada pela empresa:", { fbc, phone: sender.phone });
    return res.status(200).json({ ignored: true });
  }

  if (!fbc && typeof message === "string") {
    try {
      const url = new URL(message);
      const fbcParam = url.searchParams.get("fbc");
      if (fbcParam) fbc = fbcParam;
    } catch (e) {
      const match = message.match(/fbc=(fb\.1\.[\w.-]+)/);
      if (match && match[1]) fbc = match[1];
    }
  }

  phone = phone || (sender && sender.phone);

  if (!fbc || !fbc.startsWith("fb.") || !phone) {
    console.log("⛔ Ignorado: dados incompletos ou inválidos:", { fbc, phone });
    return res.status(400).json({ error: "Dados incompletos" });
  }

  console.log("✅ Lead recebido:", { fbc, phone, name });

  const logPath = path.join(__dirname, "tracker-fbc-log.json");
  let log = [];
  try {
    log = JSON.parse(fs.readFileSync(logPath, "utf8"));
  } catch { }

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
  res.json({ success: true });
});

// 🖐️ Rota manual do event-sent
app.post("/tracker-log-from-render.php", (req, res) => {
  let { fbc, phone, name } = req.body;

  if (!fbc || !fbc.startsWith("fb.") || !phone) {
    return res.status(400).json({ error: "Faltando fbc ou telefone" });
  }

  const logPath = path.join(__dirname, "tracker-fbc-log.json");
  let log = [];
  try {
    log = JSON.parse(fs.readFileSync(logPath, "utf8"));
  } catch { }

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

// Estáticos
app.use("/", express.static(__dirname));
app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta " + PORT);
});
