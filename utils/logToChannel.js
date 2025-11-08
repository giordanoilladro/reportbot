const { EmbedBuilder } = require('discord.js');
const { GuildSettings } = require('../models/GuildSettings');

module.exports = async function logToChannel(guild, embedData) {
  const settings = await GuildSettings.findOne({ guildId: guild.id });
  if (!settings?.logChannelId) return;

  const logChannel = guild.channels.cache.get(settings.logChannelId);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setTitle(embedData.title)
    .addFields(...embedData.fields)
    .setColor(embedData.color || 'Blue')
    .setTimestamp()
    .setFooter({ text: 'ReportBot Log' });

  await logChannel.send({ embeds: [embed] });
};