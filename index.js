const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

// Libera CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

// Função utilitária para salvar no log
function saveToLog({ fbc, phone, name }) {
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
}

// Rota de envio principal (Webhook ou invisível)
app.post("/send", (req, res) => {
  let { fbc, phone, name, message } = req.body;

  // Extração do fbc da mensagem, se estiver dentro de um link
  if (!fbc && typeof message === "string") {
    try {
      const url = new URL(message);
      const fbcParam = url.searchParams.get("fbc");
      if (fbcParam) fbc = fbcParam;
    } catch (e) {
      const match = message.match(/fb\.1\.[\w.-]+/);
      if (match && match[0]) fbc = match[0];
    }
  }

  if (!fbc || !fbc.startsWith("fb.") || !phone) {
    return res.status(400).json({ error: "Dados incompletos" });
  }

  console.log("✅ Lead recebido:", { fbc, phone, name });
  saveToLog({ fbc, phone, name });
  res.json({ success: true });
});

// Rota alternativa para envio manual (event-sent.html)
app.post("/tracker-log-from-render.php", (req, res) => {
  const { fbc, phone, name } = req.body;

  if (!fbc || !fbc.startsWith("fb.") || !phone) {
    return res.status(400).json({ error: "Faltando fbc ou telefone" });
  }

  console.log("✅ Lead manual recebido:", { fbc, phone, name });
  saveToLog({ fbc, phone, name });
  res.json({ saved: true });
});

// Serve arquivos públicos (painel, JSON, etc.)
app.use("/", express.static(__dirname));

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta " + PORT);
});
