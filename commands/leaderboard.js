const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const mongoose = require('mongoose');
const { CronJob } = require('cron'); // AGGIUNGI QUESTA DIPENDENZA: npm i cron

// Schema configurazione
const LeaderboardConfig = mongoose.model(
  'LeaderboardConfig',
  new mongoose.Schema({
    guildId: String,
    roleId: String,
    enabled: Boolean,
    channelId: String,
    messageId: String, // per editare sempre lo stesso messaggio
  }),
  'leaderboardconfigs'
);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Configura la leaderboard dello staff (tempo vocale + messaggi)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption((option) =>
      option.setName('ruolo').setDescription('Ruolo staff da tracciare').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('stato')
        .setDescription('Attiva o disattiva la leaderboard')
        .setRequired(true)
        .addChoices(
          { name: 'Attiva', value: 'true' },
          { name: 'Disattiva', value: 'false' }
        )
    )
    .addChannelOption((option) =>
      option
        .setName('canale')
        .setDescription('Canale dove postare la leaderboard')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole('ruolo');
    const stato = interaction.options.getString('stato') === 'true';
    const channel = interaction.options.getChannel('canale');

    // Salva configurazione
    const config = await LeaderboardConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      {
        guildId: interaction.guild.id,
        roleId: role.id,
        enabled: stato,
        channelId: channel.id,
      },
      { upsert: true, new: true }
    );

    // Se è stata appena attivata, avvia subito il cron job per questo server
    if (stato && !global.leaderboardJobs?.[interaction.guild.id]) {
      startDailyLeaderboard(interaction.client, interaction.guild.id);
    }

    // Se è stata disattivata, ferma il job
    if (!stato && global.leaderboardJobs?.[interaction.guild.id]) {
      global.leaderboardJobs[interaction.guild.id].stop();
      delete global.leaderboardJobs[interaction.guild.id];
    }

    await interaction.editReply({
      embeds: [
        {
          title: 'Leaderboard Staff',
          color: stato ? 0x00ff00 : 0xff0000,
          description: `
            **Stato**: ${stato ? 'Attivata' : 'Disattivata'}
            **Ruolo tracciato**: ${role}
            **Canale**: ${channel}
            **Invio giornaliero**: Ogni giorno alle **22:00**
          `.trim(),
          footer: { text: 'Configurazione salvata su MongoDB' },
          timestamp: new Date(),
        },
      ],
    });
  },
};

// === FUNZIONE CHE AVVIA LA LEADERBOARD GIORNALIERA ALLE 22:00 ===
async function sendDailyLeaderboard(client, guildId) {
  const config = await LeaderboardConfig.findOne({ guildId, enabled: true });
  if (!config) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(config.channelId);
  if (!channel) return;

  const UserStats = mongoose.model(
    'UserStats',
    new mongoose.Schema({
      userId: String,
      guildId: String,
      voiceTime: { type: Number, default: 0 },
      messageCount: { type: Number, default: 0 },
    })
  );

  const top10 = await UserStats.find({ guildId })
    .sort({ voiceTime: -1, messageCount: -1 })
    .limit(10);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const embed = {
    color: 0x5865F2,
    title: 'Staff Leaderboard del Giorno',
    description: 'Top 10 staff più attivi (tempo in vocale + messaggi)',
    thumbnail: { url: guild.iconURL({ dynamic: true }) },
    fields: [],
    footer: { text: 'Aggiornata ogni giorno alle 22:00 • Resettata a mezzanotte' },
    timestamp: new Date(),
  };

  if (top10.length === 0) {
    embed.description = 'Nessun dato oggi... lo staff sta riposando';
  } else {
    top10.forEach((stat, i) => {
      const medal = i === 0 ? '1st place' : i === 1 ? '2nd place' : i === 2 ? '3rd place' : `${i + 1}th`;
      const user = client.users.cache.get(stat.userId);
      embed.fields.push({
        name: `${medal} ${user ? user.username : 'Utente sconosciuto'}`,
        value: `Tempo in vocale: **${formatTime(stat.voiceTime)}**\nMessaggi: **${stat.messageCount.toLocaleString('it-IT')}**`,
        inline: false,
      });
    });
  }

  try {
    if (config.messageId) {
      const msg = await channel.messages.fetch(config.messageId);
      await msg.edit({ embeds: [embed] });
    } else {
      const sent = await channel.send({ embeds: [embed] });
      await LeaderboardConfig.updateOne({ guildId }, { messageId: sent.id });
    }
  } catch (err) {
    const sent = await channel.send({ embeds: [embed] });
    await LeaderboardConfig.updateOne({ guildId }, { messageId: sent.id });
  }
}

// Avvia il job alle 22:00 ogni giorno
function startDailyLeaderboard(client, guildId) {
  if (global.leaderboardJobs?.[guildId]) return;

  const job = new CronJob(
    '0 22 * * *', // Ogni giorno alle 22:00
    () => sendDailyLeaderboard(client, guildId),
    null,
    true,
    'Europe/Rome' // Fuso orario Italia
  );

  if (!global.leaderboardJobs) global.leaderboardJobs = {};
  global.leaderboardJobs[guildId] = job;
  job.start();
}

// Avvia automaticamente tutti i job esistenti all'avvio del bot (da mettere in ready event)
async function startAllDailyLeaderboards(client) {
  const configs = await LeaderboardConfig.find({ enabled: true });
  for (const config of configs) {
    startDailyLeaderboard(client, config.guildId);
  }
}

module.exports.startAllDailyLeaderboards = startAllDailyLeaderboards;