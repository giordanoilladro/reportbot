// models/UserStats.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: String,
  guildId: String,
  voiceTime: { type: Number, default: 0 },
  messageCount: { type: Number, default: 0 },
  lastReset: { type: Date, default: Date.now },
});

module.exports = mongoose.models.UserStats || mongoose.model('UserStats', schema);