// commands/utility/leaderboard.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB(); // Funziona così
const Guild = require('../../models/Guild');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Visualizza le classifiche del server'),

  async execute(interaction) {
    await interaction.deferReply();

    const guildId = interaction.guild.id;
    const guildData = await Guild.findOne({ guildId }) || { messages: new Map(), voiceTime: new Map(), channelMessages: new Map(), voiceChannelTime: new Map() };

    const messages = guildData.messages ?? new Map();
    const voiceTime = guildData.voiceTime ?? new Map();
    const channelMessages = guildData.channelMessages ?? new Map();
    const voiceChannelTime = guildData.voiceChannelTime ?? new Map();

    // Funzione per top 5 utenti (attività)
    const getTopActivity = (mapMsg, mapVoice) => {
      const combined = new Map();
      for (const [id, msgs] of mapMsg) {
        combined.set(id, (combined.get(id) || 0) + msgs);
      }
      for (const [id, minutes] of mapVoice) {
        combined.set(id, (combined.get(id) || 0) + minutes * 10); // Peso voce x10 per bilanciare
      }
      return [...combined.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, score], i) => {
          const pos = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          return `${pos} <@${id}> → **${score.toLocaleString()}** punti attività`;
        })
        .join('\n') || 'Nessun dato disponibile';
    };

    // Top 10 monete
    const allUsers = await db.all();
    const coinEntries = allUsers
      .filter(entry => entry.ID.startsWith('coins_') && interaction.guild.members.cache.has(entry.ID.split('_')[1]))
      .map(entry => ({ id: entry.ID.split('_')[1], coins: entry.value }))
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 10);

    const topCoins = coinEntries.length > 0
      ? coinEntries.map((entry, i) => {
          const pos = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          return `${pos} <@${entry.id}> → **${entry.coins.toLocaleString()}** monete 💰`;
        }).join('\n')
      : 'Nessun utente con monete';

    const embed = new EmbedBuilder()
      .setColor('#8b5cf6')
      .setTitle('🏆 CLASSIFICHE DEL SERVER')
      .setThumbnail(interaction.guild.iconURL({ size: 256 }))
      .addFields(
        { name: '💰 TOP MONETE', value: topCoins, inline: false },
        { name: '⚡ TOP ATTIVITÀ (Messaggi + Voce)', value: getTopActivity(messages, voiceTime), inline: false }
      )
      .setFooter({ text: `${interaction.guild.name} • ${interaction.guild.memberCount} membri` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};