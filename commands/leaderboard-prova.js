// commands/leaderboard-prova.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test-leadboard')
    .setDescription('Invia SUBITO la leaderboard staff (test istantaneo)')
    .addSubcommand(sub => sub
      .setName('prova')
      .setDescription('Invia immediatamente la leaderboard nel canale configurato')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (interaction.options.getSubcommand() !== 'prova') return;

    await interaction.deferReply({ ephemeral: true });

    // Carica la config del server
    const LeaderboardConfig = mongoose.model('LeaderboardConfig', new mongoose.Schema({
      guildId: String,
      roleId: String,
      enabled: Boolean,
      channelId: String,
      messageId: String,
    }), 'leaderboardconfigs');

    const config = await LeaderboardConfig.findOne({ 
      guildId: interaction.guild.id, 
      enabled: true 
    });

    if (!config) {
      return interaction.editReply({
        content: 'La leaderboard non è ancora configurata o è disattivata!\nUsa prima `/leaderboard configura` per attivarla.',
        ephemeral: true
      });
    }

    // Qui richiama la stessa funzione che usa il cron alle 22:00
    // (mettila in un file condiviso tipo utils/sendLeaderboard.js oppure copiala qui sotto)
    await require('../utils/sendLeaderboard.js')(interaction.client, interaction.guild.id);

    await interaction.editReply({
      content: 'Leaderboard inviata subito nel canale configurato!',
      ephemeral: true
    });
  },
};