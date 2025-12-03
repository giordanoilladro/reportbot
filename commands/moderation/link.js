// commands/moderation/linkdomains.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('linkdomains')
    .setDescription('Gestisci i domini permessi nell\'antilink')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Aggiungi dominio')
      .addStringOption(o => o.setName('domain').setDescription('es. youtube.com').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Rimuovi dominio')
      .addStringOption(o => o.setName('domain').setDescription('es. youtube.com').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('Vedi domini permessi')),

  async execute(interaction) {
    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || new Guild({ guildId: interaction.guild.id });
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const list = guildData.antilink.allowedDomains.join('\n') || 'Solo link Discord';
      return interaction.reply(`**Domini permessi:**\n\`\`\`\n${list}\n\`\`\``);
    }

    const domain = interaction.options.getString('domain').toLowerCase().replace(/^www\./, '');

    if (sub === 'add') {
      if (!guildData.antilink.allowedDomains.includes(domain)) {
        guildData.antilink.allowedDomains.push(domain);
        await guildData.save();
        await interaction.reply(`✅ **${domain}** aggiunto ai domini permessi!`);
      } else {
        await interaction.reply('Questo dominio è già nella lista!');
      }
    }

    if (sub === 'remove') {
      if (guildData.antilink.allowedDomains.includes(domain)) {
        guildData.antilink.allowedDomains = guildData.antilink.allowedDomains.filter(d => d !== domain);
        await guildData.save();
        await interaction.reply(`❌ **${domain}** rimosso dai domini permessi.`);
      } else {
        await interaction.reply('Questo dominio non era nella lista.');
      }
    }
  }
};