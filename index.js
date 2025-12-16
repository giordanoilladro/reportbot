require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  ActivityType,
} = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs-extra');
const path = require('path');
const cron = require('cron');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

// === CONFIG BOT ===
let statusConfig;
try {
  statusConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  console.log('config.json caricato');
} catch (err) {
  console.warn('config.json non trovato → status disattivato');
  statusConfig = null;
}

let serverConfig;
const config1Path = './data/config1.json';

try {
  serverConfig = JSON.parse(fs.readFileSync(config1Path, 'utf8'));
  console.log('config1.json caricato da /data');
} catch (err) {
  console.warn('config1.json non trovato → ne creo uno vuoto in /data');
  serverConfig = {};
  fs.writeFileSync(config1Path, JSON.stringify(serverConfig, null, 2));
}

client.serverConfig = serverConfig;
client.config1Path = config1Path;

// === CARICA COMANDI ===
const loadCommands = (dir) => {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const fullPath = path.join(dir, file);
    delete require.cache[require.resolve(fullPath)]; // per il reload
    const command = require(fullPath);
    client.commands.set(command.data.name, command);
  }

  const folders = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory());
  for (const folder of folders) loadCommands(path.join(dir, folder));
};

loadCommands(path.join(__dirname, 'commands'));

// === CARICA EVENTI ===
const eventsPath = path.join(__dirname, 'events');
fs.readdirSync(eventsPath)
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
    const fullPath = path.join(eventsPath, file);
    delete require.cache[require.resolve(fullPath)];
    const event = require(fullPath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  });

// === MONGODB ===
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connesso'))
  .catch(err => console.error('Errore MongoDB:', err));

require('./models/GuildSettings');
require('./models/User');

// === ANTI-CRASH ===
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
  fs.ensureDirSync('./logs');
  fs.appendFileSync('./logs/error.log', `[${new Date().toISOString()}] ${error.stack || error}\n`);
});

// === BACKUP OGNI 6 ORE ===
new cron.CronJob('0 */6 * * *', () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.ensureDirSync('./backups');
  if (fs.existsSync('./warns.sqlite')) {
    fs.copySync('./warns.sqlite', `./backups/warns_${timestamp}.sqlite`);
  }
  if (fs.existsSync('./servers.json')) {
    fs.copySync('./servers.json', `./backups/servers_${timestamp}.json`);
  }
  console.log(`Backup completato → ${timestamp}`);
}, null, true).start();

// === READY ===
client.once('ready', () => {
  console.log(`Bot online come ${client.user.tag}`);
  global.client = client;

  // Status rotante
  if (statusConfig?.statusList?.length > 0) {
    const list = statusConfig.statusList;
    const interval = statusConfig.statusInterval || 10000;
    let i = 0;

    const rotate = () => {
      const status = list[i];
      const type = ActivityType[status.type] || ActivityType.Playing;
      client.user.setPresence({
        activities: [{ name: status.text || 'Hamster House', type }],
        status: status.presence || 'online'
      });
      i = (i + 1) % list.length;
    };

    rotate();
    setInterval(rotate, interval);
    console.log(`${list.length} status in rotazione`);
  }
});

// === GESTIONE BOTTONI (es. report) ===
client.on('interactionCreate', async interaction => {
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

// === LOGIN ===
client.login(process.env.TOKEN);