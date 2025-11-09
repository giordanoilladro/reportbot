// dashboard/server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fetch = require('node-fetch'); // npm install node-fetch@2
const path = require('path');
const mongoose = require('mongoose');

const GuildSettings = require('../models/GuildSettings');
const { getGuildConfig, setGuildConfig } = require('../utils/configManager');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

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
// 1. ROOT → HOME.HTML (PRIMA DI TUTTO!)
// ===================================
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

    res.redirect('/dashboard'); // ← DASHBOARD SU /dashboard
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
// 2. DASHBOARD SU /dashboard
// ===================================
app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', {
    user: req.session.user,
    guilds: req.session.guilds,
    selectedGuild: null,
    settings: {}
  });
});

// === GUILD PAGE ===
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

// === SALVA CONFIG ===
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
// 3. PAGINE STATICHE
// ===================================
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/home.html'));
});

app.get('/termini', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/termini.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/privacy.html'));
});

app.get('/collabora', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/collabora.html'));
});

// ===================================
// 4. AVVIO
// ===================================
app.listen(PORT, () => {
  console.log(`Server avviato: http://localhost:${PORT}`);
  console.log(`Home: http://localhost:${PORT}/`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`Pagine: /termini | /privacy | /collabora`);
});