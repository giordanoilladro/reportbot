// dashboard/server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fetch = require('node-fetch');
const path = require('path');
const mongoose = require('mongoose');

const GuildSettings = require('../models/GuildSettings');
const { getGuildConfig, setGuildConfig } = require('../utils/configManager');

const app = express();

// === PORTA E HOST PER FLY.IO ===
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// === MONGO ===
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connesso'))
  .catch(err => console.error('MongoDB errore:', err));

// === MIDDLEWARE ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===================================
// REDIRECT AUTOMATICO LOCALHOST → hamsterhouse.it
// ===================================
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('0.0.0.0')) {
    return res.redirect(301, 'https://hamsterhouse.it' + req.originalUrl);
  }
  next();
});

// ===================================
// ROTTE STATICHE
// ===================================
const pages = ['home', 'termini', 'privacy', 'collabora'];
pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages', `${page}.html`));
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/home.html'));
});

// === OAUTH2 ===
app.get('/login', (req, res) => {
  const url = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Errore login.');

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.REDIRECT_URI,
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const tokens = await tokenResponse.json();
    if (tokens.error) throw new Error(tokens.error);

    const [userRes, guildsRes] = await Promise.all([
      fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokens.access_token}` } }),
      fetch('https://discord.com/api/users/@me/guilds', { headers: { Authorization: `Bearer ${tokens.access_token}` } })
    ]);

    const user = await userRes.json();
    const guilds = await guildsRes.json();
    const adminGuilds = guilds.filter(g => (g.permissions & 0x8) === 0x8 || g.owner);

    req.session.user = { id: user.id, username: user.username, avatar: user.avatar };
    req.session.guilds = adminGuilds;

    res.redirect('/dashboard');
  } catch (err) {
    console.error('OAuth2 error:', err);
    res.status(500).send('Errore autenticazione.');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  next();
};

// ===================================
// DASHBOARD
// ===================================
app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', {
    user: req.session.user,
    guilds: req.session.guilds,
    selectedGuild: null,
    settings: {}
  });
});

app.get('/guild/:id', requireAuth, async (req, res) => {
  const guildId = req.params.id;
  if (!req.session.guilds.some(g => g.id === guildId)) {
    return res.status(403).send('Accesso negato.');
  }

  try {
    const guild = req.session.guilds.find(g => g.id === guildId);
    const jsonSettings = getGuildConfig(guildId);
    const dbDoc = await GuildSettings.findOne({ guildId });
    const dbSettings = dbDoc ? dbDoc.toObject() : {};
    const settings = { ...dbSettings, ...jsonSettings };

    res.render('dashboard', {
      user: req.session.user,
      guilds: req.session.guilds,
      selectedGuild: guild,
      settings
    });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Errore database.');
  }
});

app.post('/guild/:id/save', requireAuth, async (req, res) => {
  const guildId = req.params.id;
  if (!req.session.guilds.some(g => g.id === guildId)) {
    return res.json({ success: false, error: 'No permessi' });
  }

  const data = req.body;

  try {
    setGuildConfig(guildId, data);
    await GuildSettings.findOneAndUpdate(
      { guildId },
      { $set: data },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Save error:', err);
    res.json({ success: false, error: err.message });
  }
});

// ===================================
// AVVIO SERVER
// ===================================
app.listen(PORT, HOST, () => {
  const URL = 'https://hamsterhouse.it';
  
  console.log('HAMSTERHOUSE DASHBOARD ONLINE');
  console.log(`APRI SUBITO → ${URL}`);
  console.log(`Dashboard → ${URL}/dashboard`);
  console.log(`Pagine → ${URL}/home | ${URL}/termini | ${URL}/privacy | ${URL}/collabora`);
  console.log(`Login → ${URL}/login`);
});