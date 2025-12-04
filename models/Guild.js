const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  guildId: String,
  antispam: {
    enabled: { type: Boolean, default: false },
    whitelistRoles: [String],
    whitelistUsers: [String],
    whitelistChannels: [String]
  },
  antilink: {
    enabled: { type: Boolean, default: false },
    whitelistRoles: [String],
    whitelistUsers: [String],
    whitelistChannels: [String],
    allowedDomains: { type: [String], default: ['discord.gg', 'discord.com', 'discordapp.com', 'discord.me'] }
  },
  messages: { type: Map, of: Number, default: {} }, // userId -> count
  voiceTime: { type: Map, of: Number, default: {} }   // userId -> seconds
  channelMessages:     { type: Map, of: Number, default: new Map() },
  voiceChannelTime:    { type: Map, of: Number, default: new Map() },
});

module.exports = mongoose.model('Guild', guildSchema);