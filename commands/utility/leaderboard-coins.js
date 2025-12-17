// commands/utility/leaderboard-coins.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard-coins')
    .setDescription('Classifica delle monete del server'),

  async execute(interaction) {
    await interaction.deferReply();

    const guildId = interaction.guild.id;

    // Recupera tutti i dati dal database
    const allEntries = await db.all();

    // Filtra SOLO le monete di QUESTO server
    const coinEntries = allEntries
      .filter(entry => entry.id.startsWith(`coins_${guildId}_`))
      .map(entry => ({
        userId: entry.id.split('_')[2], // [0] = "coins", [1] = guildId, [2] = userId
        coins: entry.value || 0
      }))
      // Ordina dal più alto al più basso
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 15); // Top 15

    // Se nessuno ha coins
    if (coinEntries.length === 0) {
      return await interaction.editReply({
        content: '📭 Nessuno ha monete in questo server ancora! Gioca con `/coinflip` per iniziare a guadagnare 💰'
      });
    }

    // Crea la classifica con medaglie
    const leaderboardText = coinEntries.map((entry, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      return `${medal} <@${entry.userId}> → **${entry.coins.toLocaleString()}** monete 💰`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#f4b400')
      .setTitle('💰 CLASSIFICA MONETE')
      .setDescription(leaderboardText)
      .setThumbnail(interaction.guild.iconURL({ size: 256 }))
      .setFooter({ text: `Server: ${interaction.guild.name} • Totale utenti: ${coinEntries.length}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};