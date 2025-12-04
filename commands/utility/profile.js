// commands/utility/profile.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Mostra il tuo profilo o il profilo di un altro utente')
    .addUserOption(option =>
      option
        .setName('utente')
        .setDescription('L\'utente da vedere')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('utente') || interaction.user;
    const member = interaction.options.getMember('utente') || interaction.member;

    // Carica dati dal DB
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    const messages = guildData?.messages ?? new Map();
    const voiceTime = guildData?.voiceTime ?? new Map();

    const msgCount = messages.get(target.id) || 0;
    const voiceMinutes = Math.floor((voiceTime.get(target.id) || 0) / 60);
    const voiceHours = Math.floor(voiceMinutes / 60);
    const remainingMinutes = voiceMinutes % 60;

    // Ruolo più alto
    const topRole = member.roles.highest.name === '@everyone' 
      ? 'Nessun ruolo' 
      : member.roles.highest;

    // Data di ingresso
    const joinDate = member.joinedAt ? `<t:${Math.floor(member.joinedAt / 1000)}:R>` : 'Sconosciuta';

    const embed = new EmbedBuilder()
      .setColor(member.displayHexColor || '#8b5cf6')
      .setAuthor({
        name: `${target.username}`,
        iconURL: target.displayAvatarURL({ size: 256 })
      })
      .setThumbnail(target.displayAvatarURL({ size: 512 }))
      .setTitle(`${member.displayName || target.username}`)
      .addFields(
        { name: 'Messaggi inviati', value: `**${msgCount.toLocaleString()}**`, inline: true },
        { 
          name: 'Tempo in voce', 
          value: voiceHours > 0 
            ? `**${voiceHours}h ${remainingMinutes}min**` 
            : `**${voiceMinutes} minuti**`, 
          inline: true 
        },
        { name: 'Ruolo più alto', value: topRole.toString(), inline: true },
        { name: 'Entrato nel server', value: joinDate, inline: true },
        { name: 'Account creato', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setFooter({ 
        text: `Richiesto da ${interaction.user.username}`, 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};