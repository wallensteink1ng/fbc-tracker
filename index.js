const express = require('express');
const fs = require('fs');
const path = require('path');
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

app.post('/send', (req, res) => {
  const { fbc, phone, name } = req.body;

  if (!fbc || !fbc.startsWith('fb.')) {
    return res.status(400).json({ error: 'FBC inválido ou ausente' });
  }

  const logPath = path.join(__dirname, 'tracker-fbc-log.json');
  let log = [];

  try {
    log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  } catch (e) {}

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

app.get('/', (req, res) => {
  res.send('FBC Tracker online - POST /send');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
