require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fetch = require('node-fetch');
const path = require('path');
const mongoose = require('mongoose');

const GuildSettings = require('../models/GuildSettings');
const { getGuildConfig, setGuildConfig } = require('../utils/configManager');

const app = express();

// === CONFIG ===
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const BASE_URL = 'https://hamsterhouse.it';

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

// === REDIRECT LOCALHOST ===
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('0.0.0.0')) {
    return res.redirect(301, BASE_URL + req.originalUrl);
  }
  next();
});

// ===================================
// ROTTE STATICHE PULITE
// ===================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/home.html'));
});

const staticPages = [
  { route: '/collabora', file: 'collabora.html' },
  { route: '/termini',    file: 'termini.html' },
  { route: '/privacy',    file: 'privacy.html' },
  { route: '/home',       file: 'home.html' }
];

staticPages.forEach(page => {
  app.get(page.route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages', page.file));
  });
});

// === OAUTH2 ===
app.get('/login', (req, res) => {
  const url = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
  res.redirect(url);
});

// === CALLBACK CON FIX TOTALI ===
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Errore: codice mancante.');

  try {
    // === BODY STRINGA (fix "modulo non valido") ===
    const body = `client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}`;

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const tokens = await tokenResponse.json();
    if (tokens.error) {
      throw new Error(`Token error: ${tokens.error_description || tokens.error}`);
    }

    if (!tokens.access_token) {
      throw new Error('Access token mancante');
    }

    // === FETCH UTENTE CON CONTROLLO ===
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!userRes.ok) {
      const err = await userRes.text();
      throw new Error(`User fetch failed (${userRes.status}): ${err}`);
    }

    const user = await userRes.json();

    // === FETCH GUILDS CON CONTROLLO ===
    const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    let guilds = [];
    if (guildsRes.ok) {
      const data = await guildsRes.json();
      if (Array.isArray(data)) {
        guilds = data;
      } else {
        console.warn('Guilds non è array:', data);
      }
    } else {
      console.warn('Guilds fetch fallita:', guildsRes.status, await guildsRes.text());
    }

    // === FILTRA ADMIN GUILDS (solo se array) ===
    const adminGuilds = Array.isArray(guilds)
      ? guilds.filter(g => g && ((g.permissions & 0x8) === 0x8 || g.owner))
      : [];

    // === SALVA SESSIONE ===
    req.session.user = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator || '0',
      avatar: user.avatar
    };
    req.session.guilds = adminGuilds;

    console.log(`Login OK: ${user.username}#${user.discriminator} | Guilds: ${adminGuilds.length}`);

    res.redirect('/dashboard');
  } catch (err) {
    console.error('OAuth2 ERRORE:', err.message);
    res.status(500).send(`Errore login: ${err.message}`);
  }
});

// === LOGOUT ===
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// === AUTENTICAZIONE ===
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
    guilds: req.session.guilds || [],
    selectedGuild: null,
    settings: {}
  });
});

app.get('/guild/:id', requireAuth, async (req, res) => {
  const guildId = req.params.id;
  if (!req.session.guilds?.some(g => g.id === guildId)) {
    return res.status(403).send('Accesso negato.');
  }

  try {
    const guild = req.session.guilds.find(g => g.id === guildId);
    const jsonSettings = getGuildConfig(guildId) || {};
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
  if (!req.session.guilds?.some(g => g.id === guildId)) {
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
// 404
// ===================================
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public/pages/404.html'));
});

// ===================================
// AVVIO
// ===================================
app.listen(PORT, HOST, () => {
  console.log('HAMSTERHOUSE DASHBOARD ONLINE');
  console.log(`APRI → ${BASE_URL}`);
  console.log(`Login → ${BASE_URL}/login`);
});