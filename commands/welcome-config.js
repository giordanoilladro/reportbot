const { 
  SlashCommandBuilder, 
  PermissionFlagsBits 
} = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome-config')
    .setDescription('Configura il benvenuto (solo admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName('canale')
        .setDescription('Canale dove inviare il benvenuto')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('stato')
        .setDescription('Attiva o disattiva il benvenuto')
        .setRequired(true)
    ),

  async execute(interaction) {
    // === SOLO ADMIN ===
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
        interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'Solo gli admin possono usare questo comando.', ephemeral: true });
    }

    const channel = interaction.options.getChannel('canale');
    const enabled = interaction.options.getBoolean('stato');

    if (!channel.isTextBased()) {
      return interaction.reply({ content: 'Scegli un canale di testo!', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    // === SALVA IN MONGODB ===
    await GuildSettings.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { 
        $set: { 
          'welcome.channelId': channel.id,
          'welcome.enabled': enabled
        }
      },
      { upsert: true }
    );

    await interaction.editReply({
      content: `Benvenuto ${enabled ? '**attivato**' : '**disattivato**'} in ${channel}!`
    });
  }
};