const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Gestisce il messaggio Reaction Roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub.setName('send').setDescription('Invia o aggiorna il messaggio Reaction Roles')
    )
    .addSubcommand((sub) =>
      sub.setName('reset').setDescription('Elimina il messaggio Reaction Roles')
    ),

  async execute(interaction) {
    // Controllo admin
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: 'Solo gli amministratori possono usare questo comando!',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;

    // LEGGE TUTTO DA MONGODB (anche se manca il campo "enabled")
    const dbDoc = await GuildSettings.findOne({ guildId });
    const config = dbDoc?.reactionroles;

    // Controllo configurazione: accetta sia vecchio che nuovo formato
    if (
      !config ||
      !config.channelId ||
      !config.roles ||
      config.roles.length === 0
    ) {
      return interaction.editReply({
        content:
          '**Reaction Roles non ancora configurato!**\nVai su https://hamsterhouse.it → Dashboard → Reaction Roles e salva la configurazione.',
        ephemeral: true,
      });
    }

    const channel = interaction.guild.channels.cache.get(config.channelId);
    if (!channel) {
      return interaction.editReply({
        content: 'Canale non trovato! Controlla che l\'ID del canale sia corretto nella dashboard.',
        ephemeral: true,
      });
    }

    // === INVIO / AGGIORNAMENTO MESSAGGIO ===
    if (interaction.options.getSubcommand() === 'send') {
      const embed = new EmbedBuilder()
        .setTitle(config.title || 'Scegli i tuoi ruoli!')
        .setDescription(config.description || 'Clicca sui pulsanti per ottenere i ruoli!')
        .setColor(config.color || '#5865F2')
        .setFooter({ text: 'Hamster House • Reaction Roles' })
        .setTimestamp();

      const rows = [];
      let row = new ActionRowBuilder();

      for (const [i, r] of config.roles.entries()) {
        const role = interaction.guild.roles.cache.get(r.roleId);
        if (!role) continue; // salta ruoli cancellati

        if (i % 5 === 0 && i !== 0) {
          rows.push(row);
          row = new ActionRowBuilder();
        }

        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`rr_${r.roleId}`)
            .setLabel(r.label || role.name)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(r.emoji || null)
        );
      }
      if (row.components.length > 0) rows.push(row);

      if (rows.length === 0) {
        return interaction.editReply({
          content: 'Nessun ruolo valido trovato! Controlla la configurazione nella dashboard.',
          ephemeral: true,
        });
      }

      let message;
      if (config.messageId) {
        try {
          message = await channel.messages.fetch(config.messageId);
          await message.edit({ embeds: [embed], components: rows });
        } catch (err) {
          message = null;
        }
      }

      if (!message) {
        message = await channel.send({ embeds: [embed], components: rows });
      }

      // Salva il messageId su MongoDB
      await GuildSettings.updateOne(
        { guildId },
        { $set: { 'reactionroles.messageId': message.id } }
      );

      await interaction.editReply({
        content: `**Messaggio Reaction Roles inviato/aggiornato con successo!**\n${message.url}`,
        ephemeral: true,
      });
    }

    // === RESET ===
    else if (interaction.options.getSubcommand() === 'reset') {
      if (config.messageId) {
        try {
          const msg = await channel.messages.fetch(config.messageId);
          await msg.delete();
        } catch (err) {
          // messaggio già cancellato o errore → va bene lo stesso
        }
      }

      await GuildSettings.updateOne(
        { guildId },
        { $unset: { 'reactionroles.messageId': '' } }
      );

      await interaction.editReply({
        content: 'Messaggio Reaction Roles eliminato e resettato con successo!',
        ephemeral: true,
      });
    }
  },
};