const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../data/recensioni.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statistiche-staff')
    .setDescription('Vedi media e numero recensioni di uno staff')
    .addUserOption(o => o.setName('staff').setDescription('Staff').setRequired(true)),

  async execute(interaction) {
    const staff = interaction.options.getUser('staff');

    if (!fs.existsSync(file)) {
      return interaction.reply({ content: 'Nessuna recensione salvata ancora!', ephemeral: true });
    }

    const tutte = JSON.parse(fs.readFileSync(file));
    const delServer = tutte.filter(r => r.guildId === interaction.guild.id && r.staffId === staff.id);

    if (delServer.length === 0) {
      return interaction.reply({ content: `${staff.username} non ha ancora recensioni in questo server.`, ephemeral: true });
    }

    const media = (delServer.reduce((a, r) => a + r.stelle, 0) / delServer.length).toFixed(2);
    const stelleMedie = '★'.repeat(Math.round(media)) + '☆'.repeat(5 - Math.round(media));

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`Statistiche di ${staff.username}`)
      .setThumbnail(staff.displayAvatarURL())
      .addFields(
        { name: 'Recensioni', value: delServer.length.toString(), inline: true },
        { name: 'Media', value: `${stelleMedie} **${media}/5**`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};