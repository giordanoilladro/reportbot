// bot.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// === PERCORSI CORRETTI ===
const dashboardPath = path.join(__dirname, 'dashboard');     // tuo-bot/dashboard/
const viewsPath = path.join(__dirname, 'views');             // tuo-bot/views/
const staticPath = path.join(__dirname, 'dashboard');        // per CSS, JS, immagini

// === VERIFICA CARTELLE ===
if (!fs.existsSync(dashboardPath)) {
  console.error('ERRORE: cartella dashboard non trovata:', dashboardPath);
  process.exit(1);
}
if (!fs.existsSync(viewsPath)) {
  console.error('ERRORE: cartella views non trovata:', viewsPath);
  process.exit(1);
}

// === CONFIG EJS ===
app.set('view engine', 'ejs');
app.set('views', viewsPath);  // <-- VIEWS NELLA ROOT
app.use(express.static(staticPath)); // <-- STATIC DA DASHBOARD

// === ROUTE DASHBOARD ===
app.get('/', (req, res) => {
  res.render('index'); // views/index.ejs
});

app.get('/guild/:id', (req, res) => {
  res.render('guild'); // views/guild.ejs
});

// === PING UPTIME ROBOT ===
app.get('/ping', (req, res) => {
  res.send('Bot online! Uptime Robot OK');
});

// === AVVIO SERVER ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Dashboard live su: https://reportbot-emqq.onrender.com`);
  console.log(`Ping: https://reportbot-emqq.onrender.com/ping`);
  console.log(`Views: ${viewsPath}`);
  console.log(`Static: ${staticPath}`);
});