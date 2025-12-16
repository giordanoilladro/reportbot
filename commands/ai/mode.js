const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hamstermode')
    .setDescription('Scegli come vuoi che ti parli Hamster Bot')
    .addStringOption(option =>
      option.setName('modalita')
        .setDescription('La personalità del bot per te')
        .setRequired(true)
        .addChoices(
          { name: 'Tossico (default)', value: 'tossico' },
          { name: 'Scherzoso', value: 'scherzoso' },
          { name: 'Serio', value: 'serio' },
          { name: 'Arrabbiato', value: 'arrabbiato' },
          { name: 'Dissing pesante', value: 'dissing' }
        )),

  async execute(interaction) {
    const mode = interaction.options.getString('modalita');
    const userId = interaction.user.id;

    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId, personalityMode: mode });
    } else {
      user.personalityMode = mode;
    }
    await user.save();

    await interaction.reply({ content: `Ora ti parlerò in modalità **${mode}**! 🐹`, ephemeral: true });
  }
};