// commands/utility/profile.js
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

    // Canvas 800x300 – perfetto per Discord
    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext('2d');

    // Sfondo galattico
    const gradient = ctx.createLinearGradient(0, 0, 800, 300);
    gradient.addColorStop(0, '#0f0a2e');
    gradient.addColorStop(0.5, '#1a0b3d');
    gradient.addColorStop(1, '#0d001a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 300);

    // Stelle sparse
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = Math.random() * 0.7 + 0.3;
      ctx.fillRect(Math.random() * 800, Math.random() * 300, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    // Avatar con bordo glow
    let avatar;
    try {
      const avatarURL = target.displayAvatarURL({ extension: 'png', size: 256 });
      avatar = await loadImage(avatarURL);
    } catch {
      avatar = await loadImage('https://discord.com/assets/1f0bfc0865dcc7548829e43b.png'); // default
    }

    // Cerchio avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(150, 150, 100, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 50, 50, 200, 200);
    ctx.restore();

    // Bordo glow avatar
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(150, 150, 106, 0, Math.PI * 2);
    ctx.stroke();

    // Nome utente + tag
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'left';
    let displayName = member?.displayName || target.username;
    if (displayName.length > 18) displayName = displayName.slice(0, 15) + '...';
    ctx.fillText(displayName, 300, 100);

    ctx.fillStyle = '#a78bfa';
    ctx.font = '36px sans-serif';
    ctx.fillText(`@${target.username}`, 300, 150);

    // Ruolo più alto (se esiste)
    if (member?.roles?.highest && member.roles.highest.name !== '@everyone') {
      ctx.fillStyle = member.roles.highest.hexColor || '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      let roleName = member.roles.highest.name;
      if (roleName.length > 25) roleName = roleName.slice(0, 22) + '...';
      ctx.fillText(roleName, 300, 200);
    }

    // Statistiche
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('Messaggi:', 300, 260);
    ctx.fillStyle = '#34d399';
    ctx.fillText('Tempo in voce:', 550, 260);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(msgCount.toLocaleString(), 300, 300);
    ctx.fillText(`${voiceMinutes.toLocaleString()} min`, 550, 300);

    // Footer piccolo
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Profilo di ${target.username} • Server: ${interaction.guild.name}`, 400, 280);

    const buffer = canvas.toBuffer('image/png');
    await interaction.editReply({
      content: `Profilo di **${target.username}**`,
      files: [new AttachmentBuilder(buffer, { name: 'profile.png' })],
    });
  },
};