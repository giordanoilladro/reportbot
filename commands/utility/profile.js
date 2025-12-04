// commands/utility/profile.js – FUNZIONA AL 100% SU HAMSTER BOT
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const Guild = require('../../models/Guild');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Mostra il tuo profilo o quello di un altro utente')
    .addUserOption(option =>
      option.setName('utente')
        .setDescription('L\'utente di cui vedere il profilo')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('utente') || interaction.user;
    const member = interaction.options.getMember('utente') || interaction.member;

    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    const messages = guildData?.messages ?? new Map();
    const voiceTime = guildData?.voiceTime ?? new Map();

    const msgCount = messages.get(target.id) || 0;
    const voiceMinutes = Math.floor((voiceTime.get(target.id) || 0) / 60);

    const canvas = createCanvas(900, 320);
    const ctx = canvas.getContext('2d');

    // Sfondo
    const bg = ctx.createLinearGradient(0, 0, 900, 320);
    bg.addColorStop(0, '#0f0a2e');
    bg.addColorStop(0.5, '#1a0b3d');
    bg.addColorStop(1, '#0d001a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 900, 320);

    // Stelle
    for (let i = 0; i < 150; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = Math.random() * 0.6 + 0.4;
      ctx.fillRect(Math.random() * 900, Math.random() * 320, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Avatar
    let avatar;
    try {
      avatar = await loadImage(target.displayAvatarURL({ extension: 'png', size: 256 }));
    } catch {
      avatar = await loadImage('https://discord.com/assets/1f0bfc0865dcc7548829e43b.png');
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(160, 160, 110, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 50, 50, 220, 220);
    ctx.restore();

    // Bordo avatar glow
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.arc(160, 160, 116, 0, Math.PI * 2);
    ctx.stroke();

    // TESTI – USA SOLO sans-serif (funziona ovunque)
    ctx.textAlign = 'left';

    // Nome
    let displayName = member?.displayName || target.username;
    if (displayName.length > 20) displayName = displayName.substring(0, 17) + '...';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText(displayName, 310, 100);

    // Tag
    ctx.fillStyle = '#a78bfa';
    ctx.font = '40px sans-serif';
    ctx.fillText(`@${target.username}`, 310, 150);

    // Ruolo più alto
    if (member?.roles?.highest && member.roles.highest.name !== '@everyone') {
      let role = member.roles.highest.name;
      if (role.length > 28) role = role.substring(0, 25) + '...';
      ctx.fillStyle = member.roles.highest.hexColor || '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(role, 310, 200);
    }

    // Statistiche
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('Messaggi:', 310, 270);

    ctx.fillStyle = '#34d399';
    ctx.fillText('Voce:', 580, 270);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(msgCount.toLocaleString(), 310, 310);
    ctx.fillText(`${voiceMinutes.toLocaleString()} min`, 580, 310);

    const buffer = canvas.toBuffer('image/png');
    await interaction.editReply({
      content: `Profilo di **${target.username}**`,
      files: [new AttachmentBuilder(buffer, { name: 'profile.png' })]
    });
  }
};