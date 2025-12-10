const { 
  SlashCommandBuilder, 
  EmbedBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// Usa /data/ per persistenza su Fly.io
const reportsPath = './data/reports.json';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reportlist')
    .setDescription('Mostra i report del server')
    .addStringOption(option =>
      option
        .setName('status')
        .setDescription('Filtra per stato')
        .setRequired(false)
        .addChoices(
          { name: 'In attesa', value: 'pending' },
          { name: 'Accettato', value: 'accepted' },
          { name: 'Rifiutato', value: 'rejected' }
        )
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    const client = interaction.client;

    // CORRETTO: usa client.serverConfig (struttura piatta)
    const guildConfig = client.serverConfig[guild.id] || {};

    // CONTROLLO PERMESSI
    if (!guildConfig.staffRoleId || !interaction.member.roles.cache.has(guildConfig.staffRoleId)) {
      return interaction.reply({ 
        content: 'Non hai i permessi per usare questo comando.', 
        ephemeral: true 
      });
    }

    // CARICA REPORTS DA /data/
    let reports = {};
    try {
      const data = fs.readFileSync(reportsPath, 'utf8');
      reports = JSON.parse(data);
    } catch (err) {
      // Crea file vuoto se non esiste
      reports = {};
      fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
    }

    const filterStatus = interaction.options.getString('status');
    const guildReports = reports[guild.id] || [];

    let filtered = guildReports;
    if (filterStatus) {
      filtered = guildReports.filter(r => r.status === filterStatus);
    }

    if (filtered.length === 0) {
      const statusText = filterStatus 
        ? (filterStatus === 'pending' ? 'pendenti' : filterStatus === 'accepted' ? 'accettati' : 'rifiutati')
        : 'totali';
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('Report del Server')
          .setDescription(`Nessun report **${statusText}**.`)
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#ff8800')
      .setTitle(`Report del Server (${filtered.length})`)
      .setDescription(
        filterStatus 
          ? `Mostra i report **${filterStatus === 'pending' ? 'pendenti' : filterStatus === 'accepted' ? 'accettati' : 'rifiutati'}**.`
          : 'Tutti i report del server.'
      )
      .setTimestamp();

    for (const r of filtered.slice(0, 10)) {
      const target = await client.users.fetch(r.targetId).catch(() => ({ tag: 'Utente Sconosciuto', id: r.targetId }));
      const reporter = await client.users.fetch(r.reporterId).catch(() => ({ tag: 'Utente Sconosciuto' }));
      const handler = r.handledBy ? await client.users.fetch(r.handledBy).catch(() => ({ tag: 'Staff Sconosciuto' })) : null;

      const statusEmoji = r.status === 'pending' ? 'Pendente' : r.status === 'accepted' ? 'Accettato' : 'Rifiutato';

      embed.addFields({
        name: `${statusEmoji} Report #${r.reportId.slice(-8)}`,
        value: [
          `**Segnalato:** ${target} (\`${r.targetId}\`)`,
          `**Da:** ${reporter.tag}`,
          `**Motivo:** ${r.reason.substring(0, 100)}${r.reason.length > 100 ? '...' : ''}`,
          `**Stato:** ${statusEmoji}${handler ? ` da ${handler}` : ''}`,
          `**Data:** <t:${Math.floor(r.timestamp / 1000)}:R>`
        ].join('\n'),
        inline: false
      });
    }

    if (filtered.length > 10) {
      embed.setFooter({ text: `...e altri ${filtered.length - 10} report. Usa il filtro per vedere di più.` });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};