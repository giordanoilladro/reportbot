const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  
  // === LOG ===
  logChannelId: { type: String, default: null },

  // === VERIFICA ===
  verify: {
    enabled: { type: Boolean, default: false },
    title: { type: String, default: 'Verifica il tuo account' },
    description: { type: String, default: 'Clicca il pulsante per verificare' },
    footer: { type: String, default: 'Sistema di verifica automatico' },
    image: { type: String, default: null },
    color: { type: String, default: '#00ff00' },
    roleId: { type: String, default: null }
  },

  reactionroles: {
    enabled: Boolean,
    channelId: String,
    messageId: String,
    title: String,
    description: String,
    color: String,
    roles: [
      {
        roleId: String,
        label: String,
      },
    ],
  },

  // === BENVENUTO ===
welcome: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null }
  },

  // === REPORT ===
  report: {
    channelId: { type: String, default: null },
    requireReason: { type: Boolean, default: true }
  },

  // === AUTO-MOD ===
  automod: {
    enabled: { type: Boolean, default: false },
    blockSwears: { type: Boolean, default: true },
    blockLinks: { type: Boolean, default: false },
    blockCaps: { type: Boolean, default: false },
    capsThreshold: { type: Number, default: 70 }
  },

  // === SETUP ===
  setup: {
    muteRoleId: { type: String, default: null },
    prefix: { type: String, default: '!' }
  }
}, { timestamps: true });

// ESPORTA DIRETTAMENTE IL MODELLO
module.exports = mongoose.model('GuildSettings', guildSettingsSchema);