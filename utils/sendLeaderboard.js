// utils/sendLeaderboard.js
const mongoose = require('mongoose');

module.exports = async (client, guildId) => {
  const LeaderboardConfig = mongoose.model('LeaderboardConfig', new mongoose.Schema({ /* come sopra */ }), 'leaderboardconfigs');
  const config = await LeaderboardConfig.findOne({ guildId, enabled: true });
  if (!config) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(config.channelId);
  if (!channel) return;

  const UserStats = mongoose.model('UserStats', new mongoose.Schema({
    userId: String,
    guildId: String,
    voiceTime: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
  }));

  const top10 = await UserStats.find({ guildId }).sort({ voiceTime: -1, messageCount: -1 }).limit(10);

  const formatTime = s => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;

  const embed = {
    color: 0x5865F2,
    title: 'Staff Leaderboard del Giorno',
    description: top10.length === 0 ? 'Nessun dato ancora...' : 'Top 10 più attivi oggi',
    thumbnail: { url: guild.iconURL({ dynamic: true }) },
    fields: [],
    footer: { text: 'Aggiornata automaticamente alle 22:00' },
    timestamp: new Date(),
  };

  top10.forEach((stat, i) => {
    const user = client.users.cache.get(stat.userId);
    const medal = i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}º`;
    embed.fields.push({
      name: `${medal} ${user?.username || 'Sconosciuto'}`,
      value: `Vocale: **${formatTime(stat.voiceTime)}**\nMessaggi: **${stat.messageCount.toLocaleString('it-IT')}**`,
      inline: false,
    });
  });

  try {
    if (config.messageId) {
      const msg = await channel.messages.fetch(config.messageId);
      await msg.edit({ embeds: [embed] });
    } else {
      const sent = await channel.send({ embeds: [embed] });
      await LeaderboardConfig.updateOne({ guildId }, { messageId: sent.id });
    }
  } catch {
    const sent = await channel.send({ embeds: [embed] });
    await LeaderboardConfig.updateOne({ guildId }, { messageId: sent.id });
  }
};