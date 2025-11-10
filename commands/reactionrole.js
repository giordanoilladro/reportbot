const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Gestisce il messaggio Reaction Roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName('send')
      .setDescription('Invia/aggiorna il messaggio Reaction Roles')
    )
    .addSubcommand(sub => sub
      .setName('reset')
      .setDescription('Elimina il messaggio Reaction Roles dal server')
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'Solo gli admin possono usare questo comando!', ephemeral: true });
    }

    const guildId = interaction.guild.id;
    let servers = {};
    try {
      if (fs.existsSync('./data/servers.json')) {
        servers = JSON.parse(fs.readFileSync('./data/servers.json', 'utf-8'));
      }
    } catch (err) {
      return interaction.reply({ content: 'Errore lettura config. Contatta lo staff.', ephemeral: true });
    }

    const config = servers[guildId]?.reactionroles;

    if (!config?.enabled || !config.channelId) {
      return interaction.reply({ content: 'Reaction Roles non configurato!\nVai sul sito → Dashboard → Reaction Roles', ephemeral: true });
    }

    const channel = interaction.guild.channels.cache.get(config.channelId);
    if (!channel) {
      return interaction.reply({ content: 'Canale non trovato! Ricontrolla la config.', ephemeral: true });
    }

    // === SUBCOMMAND: SEND ===
    if (interaction.options.getSubcommand() === 'send') {
      await interaction.deferReply({ ephemeral: true });

      const { EmbedBuilder, MessageActionRow, MessageButton } = require('discord.js');
      const embed = new EmbedBuilder()
        .setTitle(config.title || "Scegli i tuoi ruoli!")
        .setDescription(config.description || "Clicca sui pulsanti per ottenere i ruoli!")
        .setColor(config.color || "#5865F2");
      if (config.thumbnail) embed.setThumbnail(config.thumbnail);

      const buttons = [];
      for (const r of config.roles || []) {
        if (!r.roleId || !interaction.guild.roles.cache.has(r.roleId)) continue;

        const style = {
          Primary: 'PRIMARY',
          Secondary: 'SECONDARY',
          Success: 'SUCCESS',
          Danger: 'DANGER'
        }[r.style] || 'SECONDARY';

        buttons.push(
          new MessageButton()
            .setCustomId(`rr_${r.roleId}`)
            .setLabel(r.label || interaction.guild.roles.cache.get(r.roleId).name)
            .setEmoji(r.emoji || null)
            .setStyle(style)
        );
      }

      const rows = [];
      for (let i = 0; i < 3; i++) {
        const row = new MessageActionRow();
        buttons.slice(i * 5, (i + 1) * 5).forEach(b => row.addComponents(b));
        if (row.components.length) rows.push(row);
      }

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

      // Aggiorna messageId
      if (!servers[guildId]) servers[guildId] = {};
      if (!servers[guildId].reactionroles) servers[guildId].reactionroles = {};
      servers[guildId].reactionroles.messageId = message.id;
      fs.writeFileSync('./data/servers.json', JSON.stringify(servers, null, 2));

      await interaction.editReply({
        content: `Messaggio Reaction Roles inviato/aggiornato in ${channel}!\nLink: ${message.url}`,
        ephemeral: true
      });
    }

    // === SUBCOMMAND: RESET ===
    else if (interaction.options.getSubcommand() === 'reset') {
      await interaction.deferReply({ ephemeral: true });

      if (config.messageId) {
        try {
          const msg = await channel.messages.fetch(config.messageId);
          await msg.delete();
        } catch (err) {
          console.log('Messaggio già eliminato o non trovato');
        }
      }

      // Rimuovi messageId dal JSON
      if (servers[guildId]?.reactionroles) {
        delete servers[guildId].reactionroles.messageId;
        fs.writeFileSync('./data/servers.json', JSON.stringify(servers, null, 2));
      }

      await interaction.editReply({
        content: 'Messaggio Reaction Roles eliminato dal server!',
        ephemeral: true
      });
    }
  },
};