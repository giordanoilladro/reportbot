const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');

const CONFIG_FILE = '/data/config.json';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('imposta-canale-recensioni')
    .setDescription('Imposta il canale dove arrivano le recensioni')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option.setName('canale').setDescription('Canale testo').setRequired(true).addChannelTypes(ChannelType.GuildText)),

  async execute(interaction) {
    const canale = interaction.options.getChannel('canale');

    let config = {};
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8').trim();
      if (raw) config = JSON.parse(raw);
    }

    config[interaction.guild.id] = canale.id;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    await interaction.reply({ content: `Canale recensioni impostato: ${canale}`, ephemeral: true });
  },
};