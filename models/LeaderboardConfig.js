// models/LeaderboardConfig.js
const mongoose = require('mongoose');

const leaderboardConfigSchema = new mongoose.Schema({
  guildId: String,
  roleId: String,
  enabled: Boolean,
  channelId: String,
  messageId: String,
});

module.exports = mongoose.models.LeaderboardConfig || mongoose.model('LeaderboardConfig', leaderboardConfigSchema, 'leaderboardconfigs');