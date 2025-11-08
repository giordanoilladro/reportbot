const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./warns.sqlite');

db.run(`CREATE TABLE IF NOT EXISTS warns (id INTEGER PRIMARY KEY, userId TEXT, guildId TEXT, reason TEXT, moderator TEXT, time INTEGER)`);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avverti un utente')
    .addUserOption(o => o.setName('user').setDescription('Utente').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Motivo').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    db.run(`INSERT INTO warns (userId, guildId, reason, moderator, time) VALUES (?, ?, ?, ?, ?)`, [
      target.id, interaction.guild.id, reason, interaction.user.id, Date.now()
    ]);

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Warn')
      .setDescription(`${target} è stato avvertito.`)
      .addFields({ name: 'Motivo', value: reason })
      .setColor('Orange');

    await interaction.reply({ embeds: [embed] });
  },
};