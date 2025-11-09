require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs-extra');
const path = require('path');
const cron = require('cron');
const { spawn } = require('child_process'); // ← AGGIUNTO

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

// === CARICA CONFIG STATUS (config.json) ===
let statusConfig;
try {
  statusConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  console.log('config.json caricato per lo status');
} catch (err) {
  console.warn('config.json non trovato. Status disattivato.', err.message);
  statusConfig = null;
}

// === CARICA CONFIG SERVER (config1.json) ===
let serverConfig;
const config1Path = path.join(__dirname, 'config1.json');
try {
  serverConfig = JSON.parse(fs.readFileSync(config1Path, 'utf8'));
  console.log('config1.json caricato per le configurazioni server');
} catch (err) {
  console.warn('config1.json non trovato. Creo uno vuoto...');
  serverConfig = { guilds: {} };
  fs.writeFileSync(config1Path, JSON.stringify(serverConfig, null, 2));
}

// Rendi disponibile globalmente nei comandi
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

// === CARICA MODELLI ===
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
  console.log('Backup automatico completato:', t);
}).start();

// ===================================
// DASHBOARD: AVVIATA CON node .
// ===================================
let dashboardProcess = null;

if (process.env.DASHBOARD_ENABLED === 'true') {
  console.log('Avvio dashboard in background...');
  dashboardProcess = spawn('node', ['dashboard/server.js'], {
    stdio: 'inherit',     // Mostra i log della dashboard
    shell: true,
    detached: true        // Permette al bot di continuare
  });

  dashboardProcess.unref(); // Non blocca l'uscita del bot

  dashboardProcess.on('error', (err) => {
    console.error('Errore avvio dashboard:', err);
  });

  dashboardProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Dashboard chiusa con codice ${code}`);
    }
  });
}

// === EVENTO READY + STATUS ROTANTE ===
client.once('ready', () => {
  console.log(`Bot online come: ${client.user.tag} (${client.user.id})`);

  if (process.env.DASHBOARD_ENABLED === 'true') {
    const url = process.env.RAILWAY_STATIC_URL || `http://localhost:${process.env.PORT || 3000}`;
    console.log(`Dashboard attiva: ${url}`);
  }

  if (statusConfig && statusConfig.statusList && Array.isArray(statusConfig.statusList) && statusConfig.statusList.length > 0) {
    const statusList = statusConfig.statusList;
    const interval = statusConfig.statusInterval || 10000;
    let index = 0;

    const updateStatus = () => {
      const status = statusList[index];
      const validTypes = ['Playing', 'Streaming', 'Listening', 'Watching', 'Competing'];
      const type = validTypes.includes(status.type) ? ActivityType[status.type] : ActivityType.Playing;
      const validPresences = ['online', 'idle', 'dnd', 'invisible'];
      const presence = validPresences.includes(status.presence) ? status.presence : 'online';

      client.user.setPresence({
        activities: [{ name: status.text || 'Bot attivo', type }],
        status: presence
      });

      index = (index + 1) % statusList.length;
    };

    updateStatus();
    setInterval(updateStatus, interval);
    console.log(`Status rotante attivo: ${statusList.length} stati, ogni ${interval / 1000}s`);
  } else {
    console.log('Nessun status configurato in config.json');
  }
});

// GESTIONE BOTTONI
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const reportCmd = client.commands.get('report');
  if (reportCmd?.handleButton) {
    try {
      const handled = await reportCmd.handleButton(interaction);
      if (handled) return;
    } catch (err) {
      console.error('Errore bottone report:', err);
    }
  }
});

// Login
client.login(process.env.TOKEN);
 //sistemato tutto