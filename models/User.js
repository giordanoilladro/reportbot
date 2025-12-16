const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  personalityMode: {
    type: String,
    enum: ['tossico', 'serio', 'arrabbiato', 'dissing', 'scherzoso'], // aggiungi altri se vuoi
    default: 'tossico' // modalità attuale di default
  }
});

module.exports = mongoose.model('User', userSchema);