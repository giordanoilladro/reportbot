// utils/configManager.js
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config1.json');
let cache = null;

function load() {
  if (cache) return cache;
  if (!fs.existsSync(CONFIG_PATH)) {
    cache = { guilds: {} };
    save();
    return cache;
  }
  try {
    cache = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    cache = { guilds: {} };
  }
  return cache;
}

function save() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cache, null, 2));
}

// --- LOG ---
function setLogChannel(guildId, id) {
  const c = load();
  if (!c.guilds[guildId]) c.guilds[guildId] = {};
  c.guilds[guildId].logChannelId = id;
  save();
}

function getLogChannel(guildId) {
  return load().guilds[guildId]?.logChannelId || null;
}

// --- REPORT ---
function setReportChannel(guildId, id) {
  const c = load();
  if (!c.guilds[guildId]) c.guilds[guildId] = {};
  c.guilds[guildId].reportChannelId = id;
  save();
}

function getReportChannel(guildId) {
  return load().guilds[guildId]?.reportChannelId || null;
}

// --- STAFF ROLE ---
function setStaffRole(guildId, id) {
  const c = load();
  if (!c.guilds[guildId]) c.guilds[guildId] = {};
  c.guilds[guildId].staffRoleId = id;
  save();
}

function getStaffRole(guildId) {
  return load().guilds[guildId]?.staffRoleId || null;
}

// --- CONFIG GENERICA (PER DASHBOARD) ---
function getGuildConfig(guildId) {
  return load().guilds[guildId] || {};
}

function setGuildConfig(guildId, data) {
  const c = load();
  if (!c.guilds[guildId]) c.guilds[guildId] = {};
  Object.assign(c.guilds[guildId], data);
  save();
}

module.exports = {
  setLogChannel, getLogChannel,
  setReportChannel, getReportChannel,
  setStaffRole, getStaffRole, 
  getGuildConfig,
  setGuildConfig
};