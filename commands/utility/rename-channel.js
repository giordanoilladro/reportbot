const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename-channel')
    .setDescription('Rinomina il canale attuale')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option => option.setName('new_name').setDescription('Nuovo nome del canale').setRequired(true)),

  async execute(interaction) {
    const newName = interaction.options.getString('new_name');
    await interaction.channel.setName(newName);
    await interaction.reply({ content: `✅ Canale rinominato in **${newName}**`, ephemeral: true });
  }
};