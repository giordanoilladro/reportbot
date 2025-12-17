// commands/utility/leaderboard-coins.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const QuickDB = require('quick.db');
const db = new QuickDB();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard-coins')
    .setDescription('Classifica delle monete del server'),

  async execute(interaction) {
    await interaction.deferReply();

    const allUsers = await db.all();
    const coinEntries = allUsers
      .filter(entry => entry.ID.startsWith('coins_') && interaction.guild.members.cache.has(entry.ID.split('_')[1]))
      .map(entry => ({ id: entry.ID.split('_')[1], coins: entry.value }))
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 15); // Top 15 per più visibilità

    const topList = coinEntries.length > 0
      ? coinEntries.map((entry, i) => {
          const pos = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          return `${pos} <@${entry.id}> → **${entry.coins.toLocaleString()}** monete 💰`;
        }).join('\n')
      : 'Nessun utente con monete ancora!';

    const embed = new EmbedBuilder()
      .setColor('#f4b400')
      .setTitle('💰 CLASSIFICA MONETE')
      .setDescription(topList)
      .setThumbnail(interaction.guild.iconURL({ size: 256 }))
      .setFooter({ text: `Server: ${interaction.guild.name}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};