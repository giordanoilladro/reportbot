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

// === SESSIONE STABILE SU FLY.IO ===
app.set('trust proxy', 1);

let sessionConfig = {
  secret: process.env.SESSION_SECRET || 'hamsterhouse_2025_super_segretissimo_cambia_questo',
  name: 'hamster.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: true,
    httpOnly: true,
    sameSite: 'lax'
  }
};

if (process.env.MONGO_URI) {
  const MongoStore = require('connect-mongo');
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 24 * 60 * 60,
    autoRemove: 'native'
  });
}

app.use(session(sessionConfig));

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
const staticPages = ['collabora', 'termini', 'privacy', 'home'].map(p => ({ route: `/${p}`, file: `${p}.html` }));
staticPages.forEach(page => {
  app.get(page.route, (req, res) => res.sendFile(path.join(__dirname, 'public/pages', page.file)));
});

// === OAUTH2 (invariato, funziona) ===
app.get('/login', (req, res) => {
  const url = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
  res.redirect(url);
});

// ... (tutto il callback OAuth2 resta identico al tuo, funziona già)

// === AUTH MIDDLEWARE ===
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

    console.log(`Caricata configurazione per ${guildId}:`, settings); // DEBUG

    let channels = [];
    let roles = [];

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

// === SALVA CONFIGURAZIONE (FIXATO AL 100%) ===
app.post('/guild/:id/save', requireAuth, async (req, res) => {
  const guildId = req.params.id;

  if (!req.session.guilds?.some(g => g.id === guildId)) {
    return res.json({ success: false, error: 'No permessi' });
  }

  try {
    const updated = await GuildSettings.findOneAndUpdate(
      { guildId },
      { $set: req.body },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`Configurazione salvata con successo per guild ${guildId}`);
    res.json({ success: true, data: updated });

  } catch (err) {
    console.error('Errore salvataggio configurazione:', err);
    res.json({ success: false, error: 'Errore database: ' + err.message });
  }
});

// === INVIA REACTION ROLE DALLA DASHBOARD (FUNZIONA ANCHE SENZA global.client) ===
app.post('/guild/:id/reactionrole/send', requireAuth, async (req, res) => {
  const guildId = req.params.id;
  if (!req.session.guilds?.some(g => g.id === guildId))
    return res.json({ success: false, error: 'No permessi' });

  try {
    const dbDoc = await GuildSettings.findOne({ guildId });
    const config = dbDoc?.reactionroles || {};

    if (!config.channelId || !config.roles || config.roles.length === 0) {
      return res.json({ success: false, error: 'Configurazione incompleta (canale o ruoli mancanti)' });
    }

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const embed = new EmbedBuilder()
      .setTitle(config.title || 'Scegli i tuoi ruoli!')
      .setDescription(config.description || 'Clicca sui pulsanti per ottenere i ruoli!')
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
          .setEmoji(r.emoji || null)
          .setStyle(ButtonStyle.Secondary)
      );
    });
    if (row.components.length > 0) rows.push(row);

    // Usa il token del bot per inviare il messaggio
    const channelRes = await fetch(`https://discord.com/api/v10/channels/${config.channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ embeds: [embed.toJSON()], components: rows })
    });

    if (!channelRes.ok) {
      const err = await channelRes.text();
      throw new Error(`Discord API error: ${channelRes.status} - ${err}`);
    }

    const message = await channelRes.json();

    // Salva messageId
    await GuildSettings.updateOne(
      { guildId },
      { $set: { 'reactionroles.messageId': message.id } }
    );

    res.json({ success: true, messageId: message.id, url: `https://discord.com/channels/${guildId}/${config.channelId}/${message.id}` });

  } catch (err) {
    console.error('Errore invio reaction role dalla dashboard:', err);
    res.json({ success: false, error: err.message });
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