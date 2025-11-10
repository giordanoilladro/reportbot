// utils/configManager.js
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = '/data/config1.json';
let cache = null;

function load() {
  if (cache) return cache;
  
  if (!fs.existsSync(CONFIG_PATH)) {
    cache = {}; // ← SENZA "guilds"
    save();
    return cache;
  }
  
  try {
    cache = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    // ← Converti struttura vecchia se esiste
    if (cache.guilds) {
      cache = cache.guilds;
      save();
    }
  } catch {
    cache = {};
  }
  
  return cache;
}

function save() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cache, null, 2));
}

// --- FUNZIONI SPECIFICHE (compatibilità bot) ---
function setLogChannel(guildId, id) {
  const c = load();
  if (!c[guildId]) c[guildId] = {};
  c[guildId].logChannelId = id;
  save();
}

function getLogChannel(guildId) {
  return load()[guildId]?.logChannelId || null;
}

function setReportChannel(guildId, id) {
  const c = load();
  if (!c[guildId]) c[guildId] = {};
  c[guildId].report = c[guildId].report || {};
  c[guildId].report.channelId = id;
  save();
}

function getReportChannel(guildId) {
  return load()[guildId]?.report?.channelId || null;
}

function setStaffRole(guildId, id) {
  const c = load();
  if (!c[guildId]) c[guildId] = {};
  c[guildId].setup = c[guildId].setup || {};
  c[guildId].setup.muteRoleId = id; // ← Usa nome dashboard
  save();
}

function getStaffRole(guildId) {
  return load()[guildId]?.setup?.muteRoleId || null;
}

// --- DASHBOARD (compatibile con form) ---
function getGuildConfig(guildId) {
  return load()[guildId] || {};
}

function setGuildConfig(guildId, data) {
  const c = load();
  if (!c[guildId]) c[guildId] = {};
  
  // Mappa TUTTI i campi del form
  Object.keys(data).forEach(key => {
    if (key === 'logChannelId') {
      c[guildId][key] = data[key] || '';
    }
    else if (key === 'setup' && data.setup) {
      c[guildId].setup = { ...c[guildId].setup, ...data.setup };
    }
    else if (key === 'verify' && data.verify) {
      c[guildId].verify = { ...c[guildId].verify, ...data.verify };
    }
    else if (key === 'report' && data.report) {
      c[guildId].report = { ...c[guildId].report, ...data.report };
    }
  });
  
  save();
}

module.exports = {
  setLogChannel, getLogChannel,
  setReportChannel, getReportChannel,
  setStaffRole, getStaffRole,
  getGuildConfig, setGuildConfig
};