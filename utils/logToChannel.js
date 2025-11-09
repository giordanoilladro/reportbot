// utils/logToChannel.js
const { EmbedBuilder } = require('discord.js');
const { getLogChannel } = require('./configManager');
const GuildSettings = require('../models/GuildSettings');

module.exports = async function logToChannel(guild, embedData) {
  if (!guild || !embedData?.title || !Array.isArray(embedData.fields)) return;

  let logChannelId = getLogChannel(guild.id); // 1. JSON

  if (!logChannelId) {
    const settings = await GuildSettings.findOne({ guildId: guild.id });
    logChannelId = settings?.logChannelId || null; // 2. MongoDB
  }

  if (!logChannelId) return;

  const logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel?.isTextBased?.()) return;

  const embed = new EmbedBuilder()
    .setTitle(embedData.title)
    .addFields(...embedData.fields)
    .setColor(embedData.color || '#00aff4')
    .setTimestamp()
    .setFooter({ text: 'ReportBot Log', iconURL: guild.client.user.displayAvatarURL() });

  try {
    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Errore invio log:', err.message);
  }
};