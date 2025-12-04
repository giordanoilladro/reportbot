// events/voiceStateUpdate.js
const Guild = require('../models/Guild');

const activeVoice = new Map(); // userId → { start: timestamp, channelId }

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    if (!newState.guild) return;

    const userId = newState.member.id;
    const guildId = newState.guild.id;

    // Carica o crea dati del server
    let guildData = await Guild.findOne({ guildId });
    if (!guildData) guildData = new Guild({ guildId });

    // ✅ Utente ENTRA in un canale voce
    if (!oldState.channelId && newState.channelId) {
      activeVoice.set(userId, {
        start: Date.now(),
        channelId: newState.channelId
      });
    }

    // ✅ Utente ESCE o CAMBIA canale voce
    if (oldState.channelId && (!newState.channelId || oldState.channelId !== newState.channelId)) {
      const record = activeVoice.get(userId);
      if (record && record.channelId === oldState.channelId) {
        const seconds = Math.floor((Date.now() - record.start) / 1000);

        // 1. Tempo totale dell'utente
        const userTotal = guildData.voiceTime.get(userId) || 0;
        guildData.voiceTime.set(userId, userTotal + seconds);

        // 2. Tempo totale del canale voce (per la leaderboard!)
        const channelTotal = guildData.voiceChannelTime.get(oldState.channelId) || 0;
        guildData.voiceChannelTime.set(oldState.channelId, channelTotal + seconds);

        activeVoice.delete(userId);
      }
    }

    await guildData.save();
  },
};