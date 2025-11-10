const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  PermissionFlagsBits 
} = require('discord.js');
const fs = require('fs');

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
            .setRequired(false)
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Ruolo staff da pingare')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('Mostra configurazione attuale del server')
    ),

  async execute(interaction) {
    const client = interaction.client;
    const config = client.serverConfig; // ← STRUTTURA PIATTA: { "guildId": { ... } }
    const configPath = client.config1Path; // ← '/data/config1.json'
    const guildId = interaction.guild.id;

    // INIZIALIZZA (struttura piatta)
    if (!config[guildId]) config[guildId] = {};

    if (interaction.options.getSubcommand() === 'report') {
      const channel = interaction.options.getChannel('channel');
      const role = interaction.options.getRole('role');

      if (!channel && !role) {
        return interaction.reply({
          content: 'Devi specificare almeno un canale o un ruolo.',
          ephemeral: true
        });
      }

      // SALVA IN STRUTTURA DASHBOARD
      if (channel) {
        if (!config[guildId].report) config[guildId].report = {};
        config[guildId].report.channelId = channel.id;
      }
      if (role) {
        if (!config[guildId].setup) config[guildId].setup = {};
        config[guildId].setup.muteRoleId = role.id; // ← NOME DASHBOARD
      }

      // SALVA SU /data/config1.json
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
      const g = config[guildId] || {};
      const channel = g.report?.channelId ? `<#${g.report.channelId}>` : 'Non impostato';
      const role = g.setup?.muteRoleId ? `<@&${g.setup.muteRoleId}>` : 'Non impostato';

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