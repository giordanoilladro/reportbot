// bot.js - Pinger per Uptime Robot (24h online su Render)
const express = require('express');
const app = express();

// === ROUTE PRINCIPALE (Uptime Robot pinga qui) ===
app.get('/', (req, res) => {
  res.status(200).send('Bot online! Uptime Robot OK');
  console.log(`Ping ricevuto da Uptime Robot - ${new Date().toLocaleTimeString()}`);
});

// === ROUTE STATUS (opzionale - per test) ===
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    bot: 'Hamster Bot',
    uptime: `${Math.floor(process.uptime())} secondi`,
    time: new Date().toISOString(),
    message: 'Tutto funziona!'
  });
});

// === AVVIO SERVER ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Pinger avviato su porta ${PORT}`);
  console.log(`URL: https://reportbot-emqq.onrender.com`);
  console.log(`Uptime Robot: pinga ogni 5 minuti`);
});