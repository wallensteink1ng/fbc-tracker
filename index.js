const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

app.post('/send', (req, res) => {
  let { fbc, phone, name, message } = req.body;

  // ✅ Regex corrigida: detecta .fbc.fb.1... dentro da mensagem
  if (!fbc && typeof message === "string") {
    const match = message.match(/\.fbc\.(fb\.1\.[a-zA-Z0-9._-]+)/);
    if (match && match[1]) {
      fbc = match[1];
    }
  }

  // ❌ Se ainda não tiver fbc válido ou phone, ignora
  if (!fbc || !fbc.startsWith('fb.') || !phone) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  // 🟢 Loga no console do Render
  console.log('✅ Novo lead recebido:', { fbc, phone, name });

  const logPath = path.join(__dirname, 'tracker-fbc-log.json');
  let log = [];

  try {
    log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  } catch (e) {
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

// Página inicial
app.get('/', (req, res) => {
  res.send('FBC Tracker online - POST /send');
});

// 📂 Rota pública para o painel acessar o JSON
app.use('/tracker-fbc-log.json', express.static(path.join(__dirname, 'tracker-fbc-log.json')));

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
