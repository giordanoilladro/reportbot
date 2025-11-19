const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../data/canali-recensioni.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('imposta-canale-recensioni')
    .setDescription('Imposta il canale dove arrivano le recensioni')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option.setName('canale').setDescription('Canale testo').setRequired(true).addChannelTypes(ChannelType.GuildText)),

  async execute(interaction) {
    const canale = interaction.options.getChannel('canale');
    let data = {};

    if (fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file));
    data[interaction.guild.id] = canale.id;
    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    await interaction.reply({ content: `Canale recensioni impostato: ${canale}`, ephemeral: true });
  },
};