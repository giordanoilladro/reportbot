// commands/setupserver.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,               // ← NUOVO 2025
  ChannelType
} = require('discord.js');
const { setLogChannel } = require('../utils/configManager');
const GuildSettings = require('../models/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupserver')
    .setDescription('Configura il canale log del server')
    .addChannelOption(option =>
      option
        .setName('logchannel')
        .setDescription('Canale per log: ban, kick, reaction role, ecc.')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement) // ← più sicuro
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // === 1. CHECK OWNER (senza rispondere ancora) ===
    if (interaction.user.id !== process.env.BOT_OWNER_ID) {
      return interaction.reply({
        content: 'Solo l\'owner del bot può usare questo comando!',
        flags: [MessageFlags.Ephemeral]   // ← FIX 2025
      });
    }

    const logChannel = interaction.options.getChannel('logchannel');

    // === 2. DEFER IMMEDIATO (entro 1 secondo → evita 10062) ===
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // === 3. Validazione canale (dopo defer, così non scade) ===
    if (!logChannel?.isTextBased?.() || !logChannel.viewable) {
      return interaction.editReply({
        content: 'Questo canale non è valido o non è testuale!'
      });
    }

    const guildId = interaction.guild.id;

    try {
      // === 4. SALVATAGGI (anche se MongoDB è lento, non scade più) ===
      setLogChannel(guildId, logChannel.id); // json

      await GuildSettings.findOneAndUpdate(
        { guildId },
        { $set: { logChannelId: logChannel.id } },
        { upsert: true, new: true }
      );

      // === 5. SUCCESSO ===
      await interaction.editReply({
        content: `
Configurazione completata!
**Canale log impostato**: ${logChannel}
Salvato in:
• \`config1.json\`
• **MongoDB**
        `.trim()
      });

    } catch (error) {
      console.error('Errore /setupserver:', error);

      // Se per qualche motivo editReply fallisce (raro), usa followUp
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'Errore durante il salvataggio del canale log.',
          flags: [MessageFlags.Ephemeral]
        }).catch(() => {});
      }
    }
  },
};