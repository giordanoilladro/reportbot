const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Gestisce il messaggio Reaction Roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName('send')
      .setDescription('Invia o aggiorna il messaggio Reaction Roles')
    )
    .addSubcommand(sub => sub
      .setName('reset')
      .setDescription('Elimina il messaggio Reaction Roles')
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'Solo gli admin possono usare questo comando!', ephemeral: true });
    }

    const guildId = interaction.guild.id;
    const dbDoc = await GuildSettings.findOne({ guildId });
    const config = dbDoc?.reactionroles || {};

    if (!config?.enabled || !config.channelId) {
      return interaction.reply({
        content: 'Reaction Roles non configurato!\nVai su https://hamsterhouse.it → Dashboard → Reaction Roles',
        ephemeral: true
      });
    }

    const channel = interaction.guild.channels.cache.get(config.channelId);
    if (!channel) {
      return interaction.reply({ content: 'Canale non trovato! Ricontrolla la configurazione.', ephemeral: true });
    }

    if (interaction.options.getSubcommand() === 'send') {
      await interaction.deferReply({ ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(config.title || "Scegli i tuoi ruoli!")
        .setDescription(config.description || "Clicca sui pulsanti per ottenere i ruoli!")
        .setColor(config.color || "#5865F2");

      const rows = [];
      let row = new ActionRowBuilder();

      config.roles?.forEach((r, i) => {
        if (!r.roleId || !interaction.guild.roles.cache.has(r.roleId)) return;

        if (i % 5 === 0 && i !== 0) {
          rows.push(row);
          row = new ActionRowBuilder();
        }

        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`rr_${r.roleId}`)
            .setLabel(r.label || interaction.guild.roles.cache.get(r.roleId).name)
            .setStyle(ButtonStyle.Secondary)
        );
      });
      if (row.components.length) rows.push(row);

      let message;
      if (config.messageId) {
        try {
          message = await channel.messages.fetch(config.messageId);
          await message.edit({ embeds: [embed], components: rows });
        } catch {
          message = null;
        }
      }

      if (!message) {
        message = await channel.send({ embeds: [embed], components: rows });
      }

      // Salva messageId su MongoDB
      await GuildSettings.updateOne(
        { guildId },
        { $set: { "reactionroles.messageId": message.id } }
      );

      await interaction.editReply({
        content: `Messaggio Reaction Roles inviato/aggiornato!\n${message.url}`,
        ephemeral: true
      });
    }

    else if (interaction.options.getSubcommand() === 'reset') {
      await interaction.deferReply({ ephemeral: true });

      if (config.messageId) {
        try {
          const msg = await channel.messages.fetch(config.messageId);
          await msg.delete();
        } catch {}
      }

      await GuildSettings.updateOne(
        { guildId },
        { $unset: { "reactionroles.messageId": "" } }
      );

      await interaction.editReply({
        content: 'Messaggio Reaction Roles eliminato con successo!',
        ephemeral: true
      });
    }
  },
};