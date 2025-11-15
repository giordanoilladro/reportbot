require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const session = require('express-session');
const fetch = require('node-fetch');
const path = require('path');
const mongoose = require('mongoose');
const GuildSettings = require('../models/GuildSettings');

const app = express();

// === CORS ===
const cors = require('cors');
app.use(cors({
  origin: ['https://hamsterhouse.it', 'http://hamsterhouse.it'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// === CONFIG ===
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const BASE_URL = 'https://hamsterhouse.it';

// === MONGO ===
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connesso'))
    .catch(err => console.error('MongoDB errore:', err));
} else {
  console.warn('MONGO_URI mancante → DB disabilitato');
}

// === MIDDLEWARE ===
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_very_long_random_string',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, secure: true, sameSite: 'lax' }
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
// ROTTE STATICHE
// ===================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/home.html')));
const staticPages = [
  { route: '/collabora', file: 'collabora.html' },
  { route: '/termini', file: 'termini.html' },
  { route: '/privacy', file: 'privacy.html' },
  { route: '/home', file: 'home.html' }
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

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Errore: codice mancante.');

  try {
    const body = `client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}`;
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const tokens = await tokenResponse.json();
    if (tokens.error) throw new Error(tokens.error_description || 'Token mancante');

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const user = await userRes.json();

    const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    let userGuilds = await guildsRes.json();
    if (!Array.isArray(userGuilds)) userGuilds = [];

    // Prendi i server dove il bot è presente
    let botGuildIds = [];
    if (process.env.DISCORD_TOKEN) {
      try {
        const botRes = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }
        });
        if (botRes.ok) {
          const botGuilds = await botRes.json();
          botGuildIds = botGuilds.map(g => g.id);
        }
      } catch (e) { console.warn('Errore recupero guild bot:', e.message); }
    }

    const adminGuilds = userGuilds.filter(g =>
      botGuildIds.includes(g.id) && ((g.permissions & 0x8) === 0x8 || g.owner)
    );

    req.session.user = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator || '0',
      avatar: user.avatar
    };
    req.session.guilds = adminGuilds;

    console.log(`Login OK: ${user.username}#${user.discriminator || '0'} | Guilds: ${adminGuilds.length}`);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('OAuth2 ERRORE:', err.message);
    res.status(500).send(`Errore login: ${err.message}`);
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
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
    guilds: req.session.guilds || [],
    selectedGuild: null,
    settings: {},
    channels: [],
    roles: []
  });
});

app.get('/guild/:id', requireAuth, async (req, res) => {
  const guildId = req.params.id;
  if (!req.session.guilds?.some(g => g.id === guildId)) return res.status(403).send('Accesso negato.');

  try {
    const guild = req.session.guilds.find(g => g.id === guildId);
    const dbDoc = await GuildSettings.findOne({ guildId });
    const settings = dbDoc ? dbDoc.toObject() : {};

    let channels = [];
    let roles = [];

    // Usa l'API Discord (sempre affidabile)
    try {
      const guildRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }
      });

      if (guildRes.ok) {
        const guildData = await guildRes.json();

        const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
          headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }
        });

        if (channelsRes.ok) {
          const allChannels = await channelsRes.json();
          channels = allChannels
            .filter(c => c.type === 0)
            .sort((a, b) => a.position - b.position)
            .map(c => ({ id: c.id, name: c.name }));
        }

        roles = guildData.roles
          .sort((a, b) => b.position - a.position)
          .map(r => ({ id: r.id, name: r.name }));
      }
    } catch (err) {
      console.error('Errore fetch canali/ruoli:', err);
    }

    res.render('dashboard', {
      user: req.session.user,
      guilds: req.session.guilds,
      selectedGuild: guild,
      settings,
      channels,
      roles
    });
  } catch (err) {
    console.error('Errore caricamento guild:', err);
    res.status(500).send('Errore server.');
  }
});

// Salva configurazione
app.post('/guild/:id/save', requireAuth, async (req, res) => {
  const guildId = req.params.id;
  if (!req.session.guilds?.some(g => g.id === guildId))
    return res.json({ success: false, error: 'No permessi' });

  try {
    await GuildSettings.findOneAndUpdate(
      { guildId },
      { $set: req.body },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Errore salvataggio:', err);
    res.json({ success: false, error: err.message });
  }
});

// Invia/aggiorna messaggio Reaction Role dalla dashboard
app.post('/guild/:id/reactionrole/send', requireAuth, async (req, res) => {
  const guildId = req.params.id;
  if (!req.session.guilds?.some(g => g.id === guildId))
    return res.json({ success: false, error: 'No permessi' });

  try {
    const dbDoc = await GuildSettings.findOne({ guildId });
    const config = dbDoc?.reactionroles;

    if (!config?.enabled || !config.channelId || !config.roles?.length)
      return res.json({ success: false, error: 'Configurazione incompleta' });

    const guild = global.client?.guilds.cache.get(guildId);
    if (!guild) return res.json({ success: false, error: 'Bot non nel server' });

    const channel = guild.channels.cache.get(config.channelId);
    if (!channel) return res.json({ success: false, error: 'Canale non trovato' });

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const embed = new EmbedBuilder()
      .setTitle(config.title || 'Scegli i tuoi ruoli!')
      .setDescription(config.description || 'Clicca sui pulsanti qui sotto per ottenere i ruoli!')
      .setColor(config.color || '#5865F2');

    const rows = [];
    let row = new ActionRowBuilder();

    config.roles.forEach((r, i) => {
      if (i % 5 === 0 && i !== 0) {
        rows.push(row);
        row = new ActionRowBuilder();
      }
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`rr_${r.roleId}`)
          .setLabel(r.label || 'Ruolo')
          .setStyle(ButtonStyle.Secondary)
      );
    });
    if (row.components.length) rows.push(row);

    let message;
    if (config.messageId) {
      try {
        message = await channel.messages.fetch(config.messageId);
        await message.edit({ embeds: [embed], components: rows });
      } catch (e) { message = null; }
    }
    if (!message) {
      message = await channel.send({ embeds: [embed], components: rows });
    }

    await GuildSettings.updateOne(
      { guildId },
      { $set: { "reactionroles.messageId": message.id } }
    );

    res.json({ success: true, messageId: message.id });
  } catch (err) {
    console.error('Errore invio reaction role:', err);
    res.json({ success: false, error: 'Errore invio messaggio' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public/pages/404.html'));
});

app.listen(PORT, HOST, () => {
  console.log('DASHBOARD ONLINE');
  console.log(`APRI → ${BASE_URL}`);
  console.log(`Login → ${BASE_URL}/login`);
});