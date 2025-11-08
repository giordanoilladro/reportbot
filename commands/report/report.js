const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// === SISTEMA DI SALVATAGGIO IN reports.json (persistente) ===
const reportsPath = path.join(__dirname, '../../reports.json');

let reports = {};
try {
  const data = fs.readFileSync(reportsPath, 'utf8');
  reports = JSON.parse(data);
  console.log('reports.json caricato:', Object.keys(reports).length, 'server con report');
} catch (err) {
  console.warn('reports.json non trovato. Creo uno vuoto...');
  reports = {};
  fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Segnala un utente allo staff')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('L\'utente da segnalare')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Motivo della segnalazione')
        .setRequired(true)
        .setMaxLength(500)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason').trim();
    const reporter = interaction.user;
    const guild = interaction.guild;

    // === VALIDAZIONI ===
    if (target.id === reporter.id) {
      return interaction.reply({ content: 'Non puoi segnalare te stesso!', ephemeral: true });
    }
    if (target.bot) {
      return interaction.reply({ content: 'Non puoi segnalare un bot!', ephemeral: true });
    }

    // === CONFIG DAL CLIENT (config1.json) ===
    const config = interaction.client.serverConfig;
    const guildConfig = config.guilds?.[guild.id];

    if (!guildConfig?.reportChannelId) {
      return interaction.reply({
        content: 'Questo server non ha il sistema di report configurato.\nUsa `/config report` per impostarlo.',
        ephemeral: true
      });
    }

    const staffChannel = guild.channels.cache.get(guildConfig.reportChannelId);
    if (!staffChannel) {
      return interaction.reply({ content: 'Canale report non trovato. Contatta un admin.', ephemeral: true });
    }

    const staffRoleId = guildConfig.staffRoleId;
    if (!staffRoleId || !guild.roles.cache.has(staffRoleId)) {
      return interaction.reply({ content: 'Ruolo staff non configurato.', ephemeral: true });
    }

    // === ID UNIVOCO SICURO ===
    const reportId = `${Date.now()}_${reporter.id.slice(-4)}`;
    const acceptId = `report_accept_${reportId}`;
    const rejectId = `report_reject_${reportId}`;

    // === SALVA IN reports.json (PERSISTENTE) ===
    if (!reports[guild.id]) reports[guild.id] = [];
    reports[guild.id].push({
      reportId,
      targetId: target.id,
      reporterId: reporter.id,
      reason,
      status: 'pending',
      timestamp: Date.now(),
      handledBy: null,
      handledAt: null
    });
    fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));

    // === EMBED BELLISSIMO ===
    const embed = new EmbedBuilder()
      .setColor('#ff4444')
      .setTitle('Nuova Segnalazione')
      .setDescription(`**${target.tag}** è stato segnalato`)
      .addFields(
        { name: 'Segnalato', value: `${target} (\`${target.id}\`)`, inline: true },
        { name: 'Da', value: `${reporter} (\`${reporter.id}\`)`, inline: true },
        { name: 'Motivo', value: reason.length > 1000 ? reason.slice(0, 1000) + '...' : reason, inline: false },
        { name: 'Server', value: guild.name, inline: false }
      )
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setTimestamp()
      .setFooter({ text: `Report ID: ${reportId} • Usa /reportlist per vedere` });

    // === BOTTONI ===
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(acceptId)
        .setLabel('Accetta')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(rejectId)
        .setLabel('Rifiuta')
        .setStyle(ButtonStyle.Danger)
    );

    // === INVIO AL CANALE STAFF ===
    await staffChannel.send({
      content: `<@&${staffRoleId}> **Nuovo report in arrivo!**`,
      embeds: [embed],
      components: [row]
    });

    // === RISPOSTA UTENTE ===
    await interaction.reply({
      content: 'Report inviato con successo allo staff!',
      ephemeral: true
    });
  },

  // === GESTIONE BOTTONI (SENZA CACHE, usa reports.json) ===
  async handleButton(interaction) {
    if (!interaction.customId.startsWith('report_')) return false;

    const [action, reportId] = interaction.customId.split('_').slice(1);

    // === CARICA REPORT DA reports.json ===
    let reports = {};
    try {
      reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
    } catch (err) {
      return interaction.reply({ content: 'Errore nel sistema di report.', ephemeral: true });
    }

    const guildReports = reports[interaction.guild.id] || [];
    const savedReport = guildReports.find(r => r.reportId === reportId);

    if (!savedReport) {
      return interaction.reply({ content: 'Questo report non esiste o è stato eliminato.', ephemeral: true });
    }

    if (savedReport.status !== 'pending') {
      return interaction.reply({ content: 'Questo report è già stato gestito.', ephemeral: true });
    }

    // === AGGIORNA STATO ===
    savedReport.status = action === 'accept' ? 'accepted' : 'rejected';
    savedReport.handledBy = interaction.user.id;
    savedReport.handledAt = Date.now();
    fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));

    // === RISPOSTA ===
    const target = await interaction.client.users.fetch(savedReport.targetId).catch(() => ({ tag: 'Utente Sconosciuto' }));
    const reporter = await interaction.client.users.fetch(savedReport.reporterId).catch(() => ({ tag: 'Utente Sconosciuto' }));

    if (action === 'accept') {
      await interaction.reply({
        content: `${interaction.user} ha **accettato** il report contro ${target}.`,
        embeds: [new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('Report Accettato')
          .setDescription(`Motivo: ${savedReport.reason}`)
          .setTimestamp()
        ]
      });
    } else {
      await interaction.reply({
        content: `${interaction.user} ha **rifiutato** il report.`,
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('Report Rifiutato')
          .setDescription(`Motivo: ${savedReport.reason}`)
          .setTimestamp()
        ]
      });
    }

    // Rimuovi bottoni
    await interaction.message.edit({ components: [] });
    return true;
  }
};