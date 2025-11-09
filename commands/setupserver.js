// commands/setupserver.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setLogChannel } = require('../utils/configManager');
const GuildSettings = require('../models/GuildSettings'); // ← Diretto

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupserver')
    .setDescription('Configura il canale log del server')
    .addChannelOption(option =>
      option
        .setName('logchannel')
        .setDescription('Canale per log: ban, kick, reaction role, ecc.')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (interaction.user.id !== process.env.BOT_OWNER_ID) {
      return interaction.reply({ content: 'Solo l\'owner!', ephemeral: true });
    }

    const logChannel = interaction.options.getChannel('logchannel');
    if (!logChannel?.isTextBased?.()) {
      return interaction.reply({ content: 'Canale non valido!', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guild.id;

    try {
      // 1. SALVA IN config1.json
      setLogChannel(guildId, logChannel.id);

      // 2. SALVA IN MongoDB
      await GuildSettings.findOneAndUpdate(
        { guildId },
        { $set: { 'logChannelId': logChannel.id } },
        { upsert: true }
      );

      await interaction.editReply({
        content: `
Configurato!
Log: ${logChannel}
Salvato in:
- \`config1.json\`
- **MongoDB**
        `.trim(),
      });
    } catch (error) {
      console.error('Errore /setupserver:', error);
      await interaction.editReply({ content: 'Errore salvataggio.' });
    }
  },
};