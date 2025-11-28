// models/LeaderboardConfig.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  guildId: { type: String, required: true },
  roleId: String,
  enabled: Boolean,
  channelId: String,
  messageId: String,
}, { collection: 'leaderboardconfigs' });

// Questo è il trucco che elimina PER SEMPRE OverwriteModelError
module.exports = mongoose.models.LeaderboardConfig || mongoose.model('LeaderboardConfig', schema);