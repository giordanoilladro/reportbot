// bot.js
const express = require('express');
const path = require('path');
const app = express();

// === CONFIG EJS ===
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'dashboard', 'views'));
app.use(express.static(path.join(__dirname, 'dashboard')));

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
  console.log(`Dashboard su: https://reportbot-emqq.onrender.com`);
  console.log(`Ping: https://reportbot-emqq.onrender.com/ping`);
});