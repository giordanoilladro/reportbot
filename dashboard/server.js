const express = require('express');
const path = require('path');
const GuildSettings = require('../models/GuildSettings'); // CORRETTO

let client;

function start(botClient) {
  client = botClient;
  const app = express();
  const port = process.env.DASHBOARD_PORT || 3000;

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.use(express.urlencoded({ extended: true }));

  const auth = (req, res, next) => {
    const pass = req.query.p || req.body.p;
    if (pass === process.env.DASHBOARD_PASSWORD) {
      next();
    } else {
      res.send(`
        <style>body{font-family:Whitney;background:#1e2124;color:#dcddde;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
          .box{background:#2f3136;padding:30px;border-radius:12px;width:320px;text-align:center;}
          input,button{width:100%;padding:12px;margin:10px 0;border-radius:8px;border:none;font-size:16px;}
          input{background:#36393f;color:#fff;}
          button{background:#5865F2;color:white;cursor:pointer;}
          button:hover{background:#4752c4;}
        </style>
        <div class="box">
          <h2>ReportBot</h2>
          <form><input type="password" name="p" placeholder="Password" required><button>Accedi</button></form>
        </div>
      `);
    }
  };

  app.get('/', auth, (req, res) => {
    const guilds = client.guilds.cache.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      memberCount: g.memberCount,
      premiumTier: g.premiumTier || 0
    }));
    res.render('index', { guilds, password: process.env.DASHBOARD_PASSWORD });
  });

  app.get('/guild/:id', auth, async (req, res) => {
    const guildId = req.params.id;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).send('Server non trovato.');

    try {
      const settings = await GuildSettings.findOne({ guildId }) || { verify: {}, welcome: {} };
      res.render('guild', { 
        guildId, 
        guildName: guild.name, 
        guildIcon: guild.icon,
        settings, 
        password: process.env.DASHBOARD_PASSWORD 
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Errore database.');
    }
  });

  app.post('/guild/:id', auth, async (req, res) => {
    const { verify, welcome } = req.body;
    try {
      await GuildSettings.findOneAndUpdate(
        { guildId: req.params.id },
        { 
          guildId: req.params.id,
          verify: JSON.parse(verify),
          welcome: JSON.parse(welcome)
        },
        { upsert: true }
      );
      res.redirect(`/guild/${req.params.id}?p=${process.env.DASHBOARD_PASSWORD}`);
    } catch (err) {
      res.status(400).send('JSON non valido: ' + err.message);
    }
  });

  app.listen(port, () => {
    console.log(`Dashboard su http://localhost:${port}`);
    console.log(`Password: ${process.env.DASHBOARD_PASSWORD}`);
  });
}

module.exports = { start };