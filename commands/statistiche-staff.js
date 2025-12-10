const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const RECENSIONI_FILE = './data/recensioni.json';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statistiche-staff')
    .setDescription('Vedi media e numero recensioni di uno staff')
    .addUserOption(o => o.setName('staff').setDescription('Staff').setRequired(true)),

  async execute(interaction) {
    const staff = interaction.options.getUser('staff');

    if (!fs.existsSync(RECENSIONI_FILE)) {
      return interaction.reply({ content: 'Nessuna recensione ancora!', ephemeral: true });
    }

    const raw = fs.readFileSync(RECENSIONI_FILE, 'utf-8').trim();
    if (!raw) return interaction.reply({ content: 'Nessuna recensione ancora!', ephemeral: true });

    let tutte = [];
    try { tutte = JSON.parse(raw); } catch(e) {
      return interaction.reply({ content: 'Errore database, contatta un admin.', ephemeral: true });
    }

    const delServer = tutte.filter(r => r.guildId === interaction.guild.id && r.staffId === staff.id);
    if (delServer.length === 0) {
      return interaction.reply({ content: `${staff.username} non ha ancora recensioni.`, ephemeral: true });
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