const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const settings = await GuildSettings.findOne({ guildId: member.guild.id });
    const w = settings?.welcome;

    if (!w?.enabled || !w.channelId) return;

    const channel = member.guild.channels.cache.get(w.channelId);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor('#00ff88') 
      .setAuthor({
        name: `${member.user.username} è entrato nel server!`,
        iconURL: member.displayAvatarURL({ size: 256 }),
      })
      .setTitle('BENVENUTO NELLA COMMUNITY!')
      .setDescription([
        `**Ciao <@${member.id}>!**`,
        ``,
        `Sei il **${member.guild.memberCount}°** membro!`,
        `Siamo felici di averti qui!`,
        ``,
        `Leggi le <#1371842438628507718> prima di iniziare`,
        `Divertiti e fai nuove amicizie!`
      ].join('\n'))
      .setThumbnail(member.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Nome', value: member.user.tag, inline: true },
        { name: 'ID', value: `\`${member.id}\``, inline: true },
        { name: 'Account creato', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: false }
      )
      .setImage('https://i.imgur.com/lz4PWWt.jpeg') 
      .setFooter({ 
        text: 'Grazie per essere con noi!', 
        iconURL: member.guild.iconURL({ size: 128 }) 
      })
      .setTimestamp();

    try {
      await channel.send({ 
        content: `<@${member.id}>`, // Pinga l'utente
        embeds: [embed] 
      });
    } catch (err) {
      console.log('Errore benvenuto premium:', err.message);
    }
  }
};