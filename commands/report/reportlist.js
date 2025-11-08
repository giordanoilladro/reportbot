const { 
  SlashCommandBuilder, 
  EmbedBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const reportsPath = path.join(__dirname, '../../reports.json');

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
    const config = interaction.client.serverConfig;
    const guildConfig = config.guilds?.[guild.id];

    // === CONTROLLO PERMESSI: solo staffRoleId ===
    if (!guildConfig?.staffRoleId || !interaction.member.roles.cache.has(guildConfig.staffRoleId)) {
      return interaction.reply({ 
        content: 'Non hai i permessi per usare questo comando.', 
        ephemeral: true 
      });
    }

    // === CARICA REPORTS ===
    let reports = {};
    try {
      reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
    } catch (err) {
      return interaction.reply({ 
        content: 'Errore nel caricamento dei report.', 
        ephemeral: true 
      });
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

    // === EMBED PRINCIPALE ===
    const embed = new EmbedBuilder()
      .setColor('#ff8800')
      .setTitle(`Report del Server (${filtered.length})`)
      .setDescription(
        filterStatus 
          ? `Mostra i report **${filterStatus === 'pending' ? 'pendenti' : filterStatus === 'accepted' ? 'accettati' : 'rifiutati'}**.`
          : 'Tutti i report del server.'
      )
      .setTimestamp();

    // === AGGIUNGI FINO A 10 REPORT ===
    for (const r of filtered.slice(0, 10)) {
      const target = await interaction.client.users.fetch(r.targetId).catch(() => ({ tag: 'Utente Sconosciuto', id: r.targetId }));
      const reporter = await interaction.client.users.fetch(r.reporterId).catch(() => ({ tag: 'Utente Sconosciuto' }));
      const handler = r.handledBy ? await interaction.client.users.fetch(r.handledBy).catch(() => ({ tag: 'Staff Sconosciuto' })) : null;

      const statusEmoji = r.status === 'pending' ? 'Pendente' : r.status === 'accepted' ? 'Accettato' : 'Rifiutato';
      const statusText = r.status === 'pending' ? 'Pendente' : r.status === 'accepted' ? 'Accettato' : 'Rifiutato';

      embed.addFields({
        name: `${statusEmoji} Report #${r.reportId.slice(-8)}`,
        value: [
          `**Segnalato:** ${target} (\`${r.targetId}\`)`,
          `**Da:** ${reporter.tag}`,
          `**Motivo:** ${r.reason.substring(0, 100)}${r.reason.length > 100 ? '...' : ''}`,
          `**Stato:** ${statusText}${handler ? ` da ${handler}` : ''}`,
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