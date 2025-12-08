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
  origin: ['https://hamsterhouse.it', 'http://hamsterhouse.it', 'https://reportryry.fly.dev'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// === CONFIG FLY.IO ===
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';
const BASE_URL = process.env.BASE_URL || 'https://reportryry.fly.dev';

// === MONGO ===
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
    .then(() => console.log('MongoDB connesso'))
    .catch(err => console.error('MongoDB errore:', err));
} else {
  console.warn('MONGO_URI mancante → alcune funzioni disabilitate');
}

// === MIDDLEWARE ===
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// === SESSIONE – FIXATO per connect-mongo v5+ ===
const sessionConfig = {
  secret: process.env.SESSION_SECRET || '9c78140c35df616184db69473b2272bf',
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
  const { MongoStore } = require('connect-mongo');
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
    autoRemove: 'native'
  });
  console.log('Sessioni salvate su MongoDB (persistenti)');
}

app.use(session(sessionConfig));

// === VIEW ENGINE ===
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// === ROTTE STATICHE ===
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/home.html')));
['collabora', 'termini', 'privacy', 'home'].forEach(p => {
  app.get(`/${p}`, (req, res) => res.sendFile(path.join(__dirname, 'public/pages', `${p}.html`)));
});

// === OAUTH2 ===
app.get('/login', (req, res) => {
  const redirect = process.env.REDIRECT_URI || `${BASE_URL}/auth/callback`;
  const url = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=identify%20guilds`;
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Errore: nessun codice ricevuto da Discord');

  try {
    const redirect = process.env.REDIRECT_URI || `${BASE_URL}/auth/callback`;
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirect,
        scope: 'identify guilds',
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const tokens = await tokenResponse.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    const [userRes, guildsRes] = await Promise.all([
      fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokens.access_token}` } }),
      fetch('https://discord.com/api/users/@me/guilds', { headers: { Authorization: `Bearer ${tokens.access_token}` } })
    ]);

    const user = await userRes.json();
    const guilds = await guildsRes.json();

    req.session.user = user;
    req.session.guilds = guilds.filter(g => (BigInt(g.permissions) & 8n) === 8n);
    req.session.save(() => res.redirect('/dashboard'));
  } catch (err) {
    console.error('Errore OAuth callback:', err);
    res.status(500).send('Login fallito. Riprova.');
  }
});

// === AUTH MIDDLEWARE ===
const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  next();
};

// === DASHBOARD ===
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

// === GUILD DASHBOARD ===
app.get('/guild/:id', requireAuth, async (req, res) => {
  const guildId = req.params.id;
  if (!req.session.guilds?.some(g => g.id === guildId)) return res.status(403).send('Accesso negato.');

  try {
    const guild = req.session.guilds.find(g => g.id === guildId);
    const dbDoc = await GuildSettings.findOne({ guildId });
    const settings = dbDoc ? dbDoc.toObject() : {};

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

// === SALVA CONFIGURAZIONE ===
app.post('/guild/:id/save', requireAuth, async (req, res) => {
  const guildId = req.params.id;
  if (!req.session.guilds?.some(g => g.id === guildId)) {
    return res.json({ success: false, error: 'No permessi' });
  }

  try {
    const body = req.body;
    const roles = [];
    const temp = {};

    Object.keys(body).forEach(key => {
      const match = key.match(/^reactionroles\.roles\[(\d+)\]\.(roleId|label|emoji)$/);
      if (match) {
        const i = match[1];
        const field = match[2];
        temp[i] = temp[i] || {};
        temp[i][field] = body[key];
      }
    });

    Object.values(temp).forEach(r => {
      if (r.roleId && r.roleId !== '') {
        roles.push({
          roleId: r.roleId,
          label: r.label || null,
          emoji: r.emoji || null
        });
      }
    });

    body.reactionroles = body.reactionroles || {};
    body.reactionroles.roles = roles;

    await GuildSettings.findOneAndUpdate(
      { guildId },
      { $set: body },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Salvataggio completato!' });
  } catch (err) {
    console.error('ERRORE SAVE:', err);
    res.json({ success: false, error: err.message });
  }
});

// === INVIO REACTION ROLE MESSAGE ===
app.post('/guild/:id/reactionrole/send', requireAuth, async (req, res) => {
  const guildId = req.params.id;
  if (!req.session.guilds?.some(g => g.id === guildId))
    return res.json({ success: false, error: 'No permessi' });

  try {
    const dbDoc = await GuildSettings.findOne({ guildId });
    const config = dbDoc?.reactionroles || {};

    if (!config.channelId || !config.roles || config.roles.length === 0) {
      return res.json({ success: false, error: 'Configurazione incompleta' });
    }

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle(config.title || 'Scegli i tuoi ruoli!')
      .setDescription(config.description || 'Clicca sui pulsanti per ottenere i ruoli!')
      .setColor(config.color || '#5865F2');

    const rows = [];
    let row = new ActionRowBuilder();
    config.roles.forEach((r, i) => {
      if (i % 5 === 0 && i !== 0) { rows.push(row); row = new ActionRowBuilder(); }
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`rr_${r.roleId}`)
          .setLabel(r.label || 'Ruolo')
          .setEmoji(r.emoji || null)
          .setStyle(ButtonStyle.Secondary)
      );
    });
    if (row.components.length > 0) rows.push(row);

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
      throw new Error(`Discord API: ${channelRes.status} - ${err}`);
    }

    const message = await channelRes.json();
    await GuildSettings.updateOne(
      { guildId },
      { $set: { 'reactionroles.messageId': message.id } }
    );

    res.json({
      success: true,
      messageId: message.id,
      url: `https://discord.com/channels/${guildId}/${config.channelId}/${message.id}`
    });
  } catch (err) {
    console.error('Errore invio reaction role:', err);
    res.json({ success: false, error: err.message });
  }
});

// === STATIC FILES + 404 ===
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public/pages/404.html'));
});

// === AVVIO SERVER ===
app.listen(PORT, HOST, () => {
  console.log('DASHBOARD ONLINE su Fly.io');
  console.log(`Ascolto su ${HOST}:${PORT}`);
  console.log(`Apri → ${BASE_URL}`);
  console.log(`Login → ${BASE_URL}/login`);
});