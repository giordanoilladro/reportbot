const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify-config')
    .setDescription('Configura il sistema di verifica')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // SOLO ADMIN
    .addStringOption(option => option.setName('title').setDescription('Titolo embed'))
    .addStringOption(option => option.setName('description').setDescription('Descrizione embed'))
    .addStringOption(option => option.setName('image').setDescription('URL immagine'))
    .addStringOption(option => option.setName('color').setDescription('Colore hex, es. #00ff00'))
    .addRoleOption(option => option.setName('role').setDescription('Ruolo da dare'))
    .addBooleanOption(option => option.setName('enabled').setDescription('Abilita/disabilita')),

  async execute(interaction) {
    // === CONTROLLO SICUREZZA ===
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
        interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ 
        content: 'Solo gli **amministratori** o il **proprietario del server** possono usare questo comando.', 
        ephemeral: true 
      });
    }

    await interaction.deferReply({ ephemeral: true });

    let settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
    if (!settings) settings = new GuildSettings({ guildId: interaction.guild.id });

    const verify = settings.verify || {};

    if (interaction.options.getString('title')) verify.title = interaction.options.getString('title');
    if (interaction.options.getString('description')) verify.description = interaction.options.getString('description');
    if (interaction.options.getString('image')) verify.image = interaction.options.getString('image');
    if (interaction.options.getString('color')) verify.color = interaction.options.getString('color');
    if (interaction.options.getRole('role')) verify.roleId = interaction.options.getRole('role').id;
    if (interaction.options.getBoolean('enabled') !== null) verify.enabled = interaction.options.getBoolean('enabled');

    settings.verify = verify;
    await settings.save();

    await interaction.editReply({ content: 'Configurazione verifica aggiornata!' });
  }
};