// commands/utility/leaderboard-activity.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard-activity')
    .setDescription('Classifica completa attività: messaggi e voce'),

  async execute(interaction) {
    await interaction.deferReply();

    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || {
      messages: new Map(), voiceTime: new Map(), channelMessages: new Map(), voiceChannelTime: new Map()
    };

    const messages = guildData.messages ?? new Map();
    const voiceTime = guildData.voiceTime ?? new Map();
    const channelMessages = guildData.channelMessages ?? new Map();
    const voiceChannelTime = guildData.voiceChannelTime ?? new Map();

    const formatTop = (map, isTime = false) => {
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, value], i) => {
          const pos = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}⃣`;
          const val = isTime ? `${Math.floor(value / 60)} ore` : value.toLocaleString();
          return `${pos} <@${id}> → **${val}**`;
        })
        .join('\n') || 'Nessun dato';
    };

    const formatChannels = (map, isVoice = false) => {
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, value], i) => {
          const pos = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}⃣`;
          const channel = interaction.guild.channels.cache.get(id);
          const name = channel ? `#${channel.name}` : 'Canale eliminato';
          const val = isVoice ? `${Math.floor(value / 60)} ore` : value.toLocaleString();
          return `${pos} ${name} → **${val}**`;
        })
        .join('\n') || 'Nessun dato';
    };

    const embed = new EmbedBuilder()
      .setColor('#8b5cf6')
      .setTitle('⚡ CLASSIFICA ATTIVITÀ')
      .setThumbnail(interaction.guild.iconURL({ size: 256 }))
      .addFields(
        { name: '📝 TOP MESSAGGI', value: formatTop(messages), inline: true },
        { name: '🎙️ TOP TEMPO IN VOCE', value: formatTop(voiceTime, true), inline: true },
        { name: '💬 CANALI TESTO PIÙ ATTIVI', value: formatChannels(channelMessages), inline: false },
        { name: '🔊 CANALI VOCE PIÙ USATI', value: formatChannels(voiceChannelTime, true), inline: false }
      )
      .setFooter({ text: `${interaction.guild.name} • ${interaction.guild.memberCount} membri` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};