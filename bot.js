// bot.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// === PERCORSI CORRETTI ===
const dashboardPath = path.join(__dirname, 'dashboard');
const viewsPath = path.join(__dirname, 'views');
const staticPath = path.join(__dirname, 'dashboard');

// === VERIFICA CARTELLE (SE NON ESISTONO → ERRORE CHIARO) ===
if (!fs.existsSync(dashboardPath)) {
  console.error('ERRORE: cartella "dashboard" non trovata in:', dashboardPath);
  process.exit(1);
}
if (!fs.existsSync(viewsPath)) {
  console.error('ERRORE: cartella "views" non trovata in:', viewsPath);
  process.exit(1);
}

// === CONFIG EJS ===
app.set('view engine', 'ejs');
app.set('views', viewsPath); // views/index.ejs
app.use(express.static(staticPath)); // CSS, JS, immagini da dashboard/

// === HEALTH CHECK (PRIMA DI TUTTO – RENDER LO USA) ===
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'reportbot-dashboard',
    timestamp: new Date().toISOString(),
    uptime: process.uptime().toFixed(2) + 's'
  });
});

// === PING PER UPTIME ROBOT ===
app.get('/ping', (req, res) => {
  res.status(200).send('Bot online! Uptime Robot OK');
});

// === DASHBOARD ROUTES ===
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/guild/:id', (req, res) => {
  res.render('guild', { guildId: req.params.id });
});

// === 404 FALLBACK ===
app.use((req, res) => {
  res.status(404).render('404', { url: req.originalUrl });
});

// === AVVIO SERVER (PORTA DINAMICA + BIND 0.0.0.0) ===
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('REPORTBOT DASHBOARD ONLINE');
  console.log(`Server in ascolto su porta ${PORT}`);
  console.log(`Dashboard: https://reportbot-emqq.onrender.com`);
  console.log(`Health:     https://reportbot-emqq.onrender.com/health`);
  console.log(`Ping:       https://reportbot-emqq.onrender.com/ping`);
  console.log(`Views:      ${viewsPath}`);
  console.log(`Static:     ${staticPath}`);
});

// === GRACEFUL SHUTDOWN (per Render) ===
process.on('SIGTERM', () => {
  console.log('SIGTERM ricevuto: chiusura server...');
  server.close(() => {
    console.log('Server chiuso con successo.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT ricevuto: chiusura...');
  server.close(() => process.exit(0));
});