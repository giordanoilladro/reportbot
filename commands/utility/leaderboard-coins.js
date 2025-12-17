// commands/utility/leaderboard-coins.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard-coins')
    .setDescription('Visualizza la classifica dei membri più ricchi del server 💰'),

  async execute(interaction) {
    await interaction.deferReply();

    const guildId = interaction.guild.id;

    // Recupera tutti i dati dal database
    const allEntries = await db.all();

    // Filtra solo le monete di questo server
    const coinEntries = allEntries
      .filter(entry => entry.id.startsWith(`coins_${guildId}_`))
      .map(entry => ({
        userId: entry.id.split('_')[2],
        coins: entry.value || 0
      }))
      .sort((a, b) => b.coins - a.coins) // Dal più ricco
      .slice(0, 15); // Top 15

    // Messaggio se nessuno ha monete
    if (coinEntries.length === 0) {
      return await interaction.editReply({
        content: '📭 Nessun membro ha ancora monete in questo server!\nInizia a guadagnarle con i comandi disponibili 💰'
      });
    }

    // Costruisci la classifica con medaglie
    const leaderboardLines = coinEntries.map((entry, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      return `${medal} <@${entry.userId}> → **${entry.coins.toLocaleString()}** monete 💰`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xF4B400) // Oro brillante
      .setTitle('🏆 CLASSIFICA MONETE DEL SERVER')
      .setDescription(leaderboardLines.join('\n'))
      .setThumbnail(interaction.guild.iconURL({ size: 256 }))
      .setFooter({
        text: `${interaction.guild.name} • ${coinEntries.length} ${coinEntries.length === 1 ? 'membro' : 'membri'} in classifica`
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};