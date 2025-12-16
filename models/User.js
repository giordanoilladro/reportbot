// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  personalityMode: {
    type: String,
    enum: ['tossico', 'scherzoso', 'serio', 'arrabbiato', 'dissing'],
    default: 'tossico'
  }
});

module.exports = mongoose.model('User', userSchema);