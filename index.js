require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs-extra');
const path = require('path');
const cron = require('cron');
const { spawn } = require('child_process');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

// === CARICA CONFIG ===
let statusConfig;
try {
  statusConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  console.log('config.json caricato');
} catch (err) {
  console.warn('config.json non trovato. Status disattivato.');
  statusConfig = null;
}

let serverConfig;
const config1Path = '/data/config1.json'; // ← STESSO PERCORSO DELLA DASHBOARD

try {
  serverConfig = JSON.parse(fs.readFileSync(config1Path, 'utf8'));
  console.log('config1.json caricato da /data');
} catch (err) {
  console.warn('config1.json non trovato in /data. Creo uno vuoto...');
  serverConfig = {}; // ← STRUTTURA SENZA "guilds"
  fs.writeFileSync(config1Path, JSON.stringify(serverConfig, null, 2));
}

client.serverConfig = serverConfig;
client.config1Path = config1Path;

// Carica comandi
const loadCommands = (dir) => {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const cmd = require(path.join(dir, file));
    client.commands.set(cmd.data.name, cmd);
  }
  const subdirs = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory());
  for (const sub of subdirs) loadCommands(path.join(dir, sub));
};

loadCommands(path.join(__dirname, 'commands'));

// Carica eventi
const eventsPath = path.join(__dirname, 'events');
fs.readdirSync(eventsPath)
  .filter(f => f.endsWith('.js'))
  .forEach(file => {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  });

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connesso'))
  .catch(err => console.error('Errore MongoDB:', err));

require('./models/GuildSettings');

// Anti-crash
process.on('unhandledRejection', err => {
  console.error('Errore non gestito:', err);
  fs.ensureDirSync('./logs');
  fs.appendFileSync('./logs/error.log', `${new Date()}: ${err}\n`);
});

// Backup ogni 6 ore
new cron.CronJob('0 */6 * * *', () => {
  const t = new Date().toISOString().replace(/[:.]/g, '-');
  fs.ensureDirSync('./backups');
  fs.copySync('./warns.sqlite', `./backups/warns_${t}.sqlite`);
  fs.copySync('./servers.json', `./backups/servers_${t}.json`);
  console.log('Backup completato:', t);
}).start();

// ===================================
// DASHBOARD + BOT SULLO STESSO PORT (GENIO)
// ===================================
let dashboardProcess = null;

if (process.env.DASHBOARD_ENABLED === 'true') {
  console.log('Avvio dashboard integrata...');
  dashboardProcess = spawn('node', ['dashboard/server.js'], {
    stdio: 'inherit',
    shell: true,
    detached: true,
    env: { ...process.env, PORT: process.env.PORT || 3000 } // FORZA IL PORT CORRETTO
  });

  dashboardProcess.unref();

  dashboardProcess.on('error', (err) => {
    console.error('Errore dashboard:', err);
  });
}

// === READY + URL CORRETTO PER SEMPRE ===
client.once('ready', () => {
  console.log(`Bot online: ${client.user.tag}`);

  // URL INTELLIGENTE - FUNZIONA OVUNQUE (Fly.io, Render, Railway, Hostinger)
  const dashboardUrl = 
    process.env.RENDER_EXTERNAL_URL ||
    process.env.RAILWAY_STATIC_URL ||
    process.env.FLY_APP_URL ||
    process.env.CF_PAGES_URL ||
    `https://hamsterhouse.it`;

  if (process.env.DASHBOARD_ENABLED === 'true') {
    console.log(`DASHBOARD ATTIVA → ${dashboardUrl}`);
    console.log(`Apri subito: ${dashboardUrl}`);
  }

  // Status rotante
  if (statusConfig?.statusList?.length > 0) {
    const statusList = statusConfig.statusList;
    const interval = statusConfig.statusInterval || 10000;
    let index = 0;

    const updateStatus = () => {
      const s = statusList[index];
      const type = ActivityType[s.type] || ActivityType.Playing;
      client.user.setPresence({
        activities: [{ name: s.text || 'Hamster House', type }],
        status: s.presence || 'online'
      });
      index = (index + 1) % statusList.length;
    };

    updateStatus();
    setInterval(updateStatus, interval);
    console.log(`Status rotante: ${statusList.length} stati`);
  }
});

// Gestione bottoni
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  const reportCmd = client.commands.get('report');
  if (reportCmd?.handleButton) {
    try {
      await reportCmd.handleButton(interaction);
    } catch (err) {
      console.error('Errore bottone:', err);
    }
  }
});

// Login
client.login(process.env.TOKEN);

global.client = client;