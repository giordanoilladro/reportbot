// bot.js – SOLO UPTIME ROBOT
const express = require('express');
const app = express();

app.get('/ping', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Uptime Robot attivo su porta ${PORT}`);
  console.log(`PING: https://reportbot-emqq.onrender.com`);
});