const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const Guild = require('../../models/Guild');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Mostra la classifica del server (messaggi e voce)'),

  async execute(interaction) {
    await interaction.deferReply();
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guildData) return interaction.editReply('Nessun dato ancora registrato!');

    // Preparazione dati
    const msgEntries = [...guildData.messages.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const voiceEntries = [...guildData.voiceTime.entries()]
      .map(([id, seconds]) => ({ id, seconds: Math.floor(seconds / 60) }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 3);

    // Canvas 800x600
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    // Sfondo gradiente
    const grad = ctx.createLinearGradient(0, 0, 0, 600);
    grad.addColorStop(0, '#2a2a72');
    grad.addColorStop(1, '#090979');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 600);

    ctx.font = 'bold 42px Sans';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(interaction.guild.name, 400, 60);

    // Funzione per sezione
    const drawSection = (title, y, data, type) => {
      ctx.font = 'bold 32px Sans';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(title, 400, y);

      ctx.font = '28px Sans';
      ctx.fillStyle = '#ffffff';
      data.forEach(async (entry, i) => {
        const member = await interaction.guild.members.fetch(entry.id).catch(() => null);
        const name = member ? member.displayName : 'Utente sconosciuto';
        const value = type === 'msg' ? entry.count + ' messaggi' : entry.seconds + ' minuti';
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
        ctx.fillText(`${medal} ${name}`, 400, y + 50 + i * 50);
        ctx.font = '24px Sans';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(value, 400, y + 75 + i * 50);
        ctx.font = '28px Sans';
        ctx.fillStyle = '#ffffff';
      });
    };

    drawSection('📝 Top Messaggi', 120, msgEntries, 'msg');
    drawSection('🔊 Top Tempo Voce', 320, voiceEntries, 'voice');

    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.png' });
    await interaction.editReply({ files: [attachment] });
  }
};