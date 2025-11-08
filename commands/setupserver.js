const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { GuildSettings } = require('../models/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupserver')
    .setDescription('Configura il server (solo owner)')
    .addChannelOption(option => option.setName('logchannel').setDescription('Canale log').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction, client) {
    if (interaction.user.id !== process.env.BOT_OWNER_ID) {
      return interaction.reply({ content: 'Solo l\'owner può usare questo!', ephemeral: true });
    }

    const logChannel = interaction.options.getChannel('logchannel');
    await interaction.deferReply({ ephemeral: true });

    await GuildSettings.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { guildId: interaction.guild.id, logChannelId: logChannel.id },
      { upsert: true }
    );

    await interaction.editReply('Server configurato! Log in ' + logChannel);
  },
};