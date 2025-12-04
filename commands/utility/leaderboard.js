// commands/utility/leaderboard.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Classifica completa del server – 4 sezioni'),

  async execute(interaction) {
    await interaction.deferReply();

    const guildData = await Guild.findOne({ guildId: interaction.guild.id });

    const messages         = guildData?.messages         ?? new Map();
    const voiceTime        = guildData?.voiceTime        ?? new Map();
    const channelMessages  = guildData?.channelMessages  ?? new Map();
    const voiceChannelTime = guildData?.voiceChannelTime ?? new Map();

    // Funzione per prendere top 5
    const getTop5 = (map, isMinutes = false) => {
      return [...map.entries()]
        .sort((a, b) => (isMinutes ? b[1] - a[1] : b[1] - a[1]))
        .slice(0, 5)
        .map(([id, value], i) => {
          const pos = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}⃣`;
          const val = isMinutes ? `${Math.floor(value / 60)} min` : value.toLocaleString();
          return `${pos} <@${id}> → **${val}**`;
        })
        .join('\n') || 'Nessun dato';
    };

    const getTopChannels = (map, isVoice = false) => {
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, value], i) => {
          const pos = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}⃣`;
          const channel = interaction.guild.channels.cache.get(id);
          const name = channel ? `#${channel.name}` : 'Canale eliminato';
          const val = isVoice ? `${Math.floor(value / 60)} min` : value.toLocaleString();
          return `${pos} ${name} → **${val}**`;
        })
        .join('\n') || 'Nessun dato';
    };

    const embed = new EmbedBuilder()
      .setColor('#8b5cf6')
      .setTitle('CLASSIFICA COMPLETA DEL SERVER')
      .setThumbnail(interaction.guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'TOP MESSAGGI UTENTI', value: getTop5(messages), inline: false },
        { name: 'CANALI TESTO PIÙ ATTIVI', value: getTopChannels(channelMessages), inline: false },
        { name: 'TOP TEMPO IN VOCE', value: getTop5(voiceTime, true), inline: false },
        { name: 'CANALI VOCE PIÙ USATI', value: getTopChannels(voiceChannelTime, true), inline: false }
      )
      .setFooter({ text: `Server: ${interaction.guild.name} • ${interaction.guild.memberCount} membri` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};