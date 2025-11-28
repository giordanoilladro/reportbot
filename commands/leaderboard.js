// commands/leaderboard.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const { CronJob } = require('cron');
const LeaderboardConfig = require('../models/LeaderboardConfig');
const UserStats = require('../models/UserStats');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Configura la leaderboard giornaliera dello staff')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(o => o.setName('ruolo').setDescription('Ruolo staff').setRequired(true))
    .addStringOption(o => o
      .setName('stato')
      .setDescription('Attiva o disattiva')
      .setRequired(true)
      .addChoices({ name: 'Attiva', value: 'true' }, { name: 'Disattiva', value: 'false' })
    )
    .addChannelOption(o => o
      .setName('canale')
      .setDescription('Canale dove postare')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole('ruolo');
    const stato = interaction.options.getString('stato') === 'true';
    const channel = interaction.options.getChannel('canale');

    // Salva configurazione
    await LeaderboardConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { guildId: interaction.guild.id, roleId: role.id, enabled: stato, channelId: channel.id },
      { upsert: true, new: true }
    );

    // Gestione cron job
    if (stato && !global.leaderboardJobs?.[interaction.guild.id]) {
      const job = new CronJob('0 22 * * *', () => sendLeaderboard(interaction.client, interaction.guild.id), null, true, 'Europe/Rome');
      if (!global.leaderboardJobs) global.leaderboardJobs = {};
      global.leaderboardJobs[interaction.guild.id] = job;
      job.start();
    }
    if (!stato && global.leaderboardJobs?.[interaction.guild.id]) {
      global.leaderboardJobs[interaction.guild.id].stop();
      delete global.leaderboardJobs[interaction.guild.id];
    }

    await interaction.editReply({
      embeds: [{
        title: 'Leaderboard Staff',
        color: stato ? 0x00ff00 : 0xff0000,
        description: `
          **Stato**: ${stato ? 'Attivata' : 'Disattivata'}
          **Ruolo**: ${role}
          **Canale**: ${channel}
          **Invio**: Ogni giorno alle **22:00**
        `.trim(),
        footer: { text: 'Configurazione salvata!' },
        timestamp: new Date(),
      }]
    });
  },
};

// Funzione condivisa per inviare la leaderboard (usata dal cron e da /prova)
async function sendLeaderboard(client, guildId) {
  const config = await LeaderboardConfig.findOne({ guildId, enabled: true });
  if (!config) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(config.channelId);
  if (!channel) return;

  const top10 = await UserStats.find({ guildId })
    .sort({ voiceTime: -1, messageCount: -1 })
    .limit(10);

  const formatTime = s => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;

  const embed = {
    color: 0x5865F2,
    title: 'Staff Leaderboard del Giorno',
    description: top10.length === 0 ? 'Nessun dato oggi...' : 'Top 10 più attivi',
    thumbnail: { url: guild.iconURL({ dynamic: true }) },
    fields: [],
    footer: { text: 'Aggiornata ogni giorno alle 22:00 • Resettata a mezzanotte' },
    timestamp: new Date(),
  };

  top10.forEach((stat, i) => {
    const user = client.users.cache.get(stat.userId);
    const medal = i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}º`;
    embed.fields.push({
      name: `${medal} ${user?.username || 'Sconosciuto'}`,
      value: `Vocale: **${formatTime(stat.voiceTime)}**\nMessaggi: **${stat.messageCount.toLocaleString('it-IT')}**`,
      inline: false,
    });
  });

  try {
    if (config.messageId) {
      const msg = await channel.messages.fetch(config.messageId);
      await msg.edit({ embeds: [embed] });
    } else {
      const sent = await channel.send({ embeds: [embed] });
      await LeaderboardConfig.updateOne({ guildId }, { messageId: sent.id });
    }
  } catch {
    const sent = await channel.send({ embeds: [embed] });
    await LeaderboardConfig.updateOne({ guildId }, { messageId: sent.id });
  }
}

global.sendLeaderboard = sendLeaderboard; // così la puoi chiamare da altri comandi (es. /leaderboard prova)

// Avvia tutti i job all'avvio del bot (da chiamare nel ready event)
async function startAllJobs(client) {
  const configs = await LeaderboardConfig.find({ enabled: true });
  for (const cfg of configs) {
    if (!global.leaderboardJobs?.[cfg.guildId]) {
      const job = new CronJob('0 22 * * *', () => sendLeaderboard(client, cfg.guildId), null, true, 'Europe/Rome');
      if (!global.leaderboardJobs) global.leaderboardJobs = {};
      global.leaderboardJobs[cfg.guildId] = job;
      job.start();
    }
  }
}

module.exports.startAllJobs = startAllJobs;