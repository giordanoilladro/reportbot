const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  PermissionFlagsBits 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// Usa client.serverConfig e client.config1Path (passati da index.js)
module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configura il sistema di report')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('report')
        .setDescription('Configura report')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Canale dove inviare i report')
            .addChannelTypes(0)
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Ruolo staff da pingare')
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('Mostra configurazione attuale del server')
    ),

  async execute(interaction) {
    const client = interaction.client;
    const config = client.serverConfig;
    const configPath = client.config1Path;
    const guildId = interaction.guild.id;

    // Inizializza
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[guildId]) config.guilds[guildId] = {};

    if (interaction.options.getSubcommand() === 'report') {
      const channel = interaction.options.getChannel('channel');
      const role = interaction.options.getRole('role');

      if (!channel && !role) {
        return interaction.reply({
          content: 'Devi specificare almeno un canale o un ruolo.',
          ephemeral: true
        });
      }

      if (channel) config.guilds[guildId].reportChannelId = channel.id;
      if (role) config.guilds[guildId].staffRoleId = role.id;

      // Salva
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Configurazione Aggiornata')
        .setDescription('Il sistema di report è stato configurato!')
        .addFields(
          { name: 'Canale Report', value: channel ? `${channel}` : 'Non modificato', inline: true },
          { name: 'Ruolo Staff', value: role ? `${role}` : 'Non modificato', inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    else if (interaction.options.getSubcommand() === 'view') {
      const g = config.guilds[guildId] || {};
      const channel = g.reportChannelId ? `<#${g.reportChannelId}>` : 'Non impostato';
      const role = g.staffRoleId ? `<@&${g.staffRoleId}>` : 'Non impostato';

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Configurazione Report')
        .addFields(
          { name: 'Canale Report', value: channel, inline: true },
          { name: 'Ruolo Staff', value: role, inline: true }
        )
        .setFooter({ text: 'Usa /config report per modificare' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};