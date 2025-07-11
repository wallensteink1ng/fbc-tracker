const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

const COMPANY_NUMBER = "353892490262"; // Seu número

app.post("/send", (req, res) => {
  let { fbc, phone, name, message, sender } = req.body;

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

  // Verificação aprimorada
  if (!fbc || !fbc.startsWith("fb.") || !sender || !sender.phone) {
    console.log("⛔ Ignorado: dados incompletos ou inválidos:", { fbc, phone });
    return res.status(400).json({ error: "Dados incompletos" });
  }

  const realPhone = sender.phone;
  if (realPhone === COMPANY_NUMBER) {
    console.log("⛔ Ignorado: número da empresa:", { fbc, phone: realPhone });
    return res.json({ ignored: true });
  }

  console.log("✅ Lead válido recebido:", { fbc, phone: realPhone });

  const logPath = path.join(__dirname, "tracker-fbc-log.json");
  let log = [];
  try {
    log = JSON.parse(fs.readFileSync(logPath, "utf8"));
  } catch {
    log = [];
  }

  const existing = log.find(entry => entry.fbc === fbc);
  if (existing) {
    existing.phone = realPhone;
    if (name) existing.name = name;
  } else {
    log.unshift({
      fbc,
      phone: realPhone,
      name: name || null,
      timestamp: new Date().toISOString()
    });
  }

  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  res.json({ success: true });
});

app.use("/", express.static(__dirname));

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta " + PORT);
});
