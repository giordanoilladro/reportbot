const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const Guild = require('../../models/Guild');
const path = require('path');

// REGISTRA FONT SICURI (funzionano ovunque)
//registerFont(path.join(__dirname, '../../fonts/Roboto-Bold.ttf'), { family: 'Roboto' });
//registerFont(path.join(__dirname, '../../fonts/NotoEmoji-Regular.ttf'), { family: 'Noto Emoji' });
// Se usi Arial come fallback
//registerFont(path.join(__dirname, '../../fonts/Arial.ttf'), { family: 'Arial' });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Classifica messaggi e voce del server'),

  async execute(interaction) {
    await interaction.deferReply();

    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guildData || (guildData.messages.size === 0 && guildData.voiceTime.size === 0)) {
      return interaction.editReply('Nessun dato ancora registrato nel server!');
    }

    // Top 3 messaggi
    const topMsg = [...guildData.messages.entries()]
      .map(([id, count]) => ({ id, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    // Top 3 voce (in minuti)
    const topVoice = [...guildData.voiceTime.entries()]
      .map(([id, seconds]) => ({ id, value: Math.floor(seconds / 60) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    // Canvas 900x600 – più spazio = più bello
    const canvas = createCanvas(900, 600);
    const ctx = canvas.getContext('2d');

    // Sfondo gradiente bello
    const gradient = ctx.createLinearGradient(0, 0, 0, 600);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 900, 600);

    // Titolo server
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Roboto';
    ctx.textAlign = 'center';
    ctx.fillText(interaction.guild.name.toUpperCase(), 450, 70);

    ctx.font = '30px Roboto';
    ctx.fillStyle = '#7289da';
    ctx.fillText('LEADERBOARD', 450, 110);

    // Funzione per disegnare una sezione
    const drawSection = async (title, emoji, y, data, isTime = false) => {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 36px Roboto';
      ctx.textAlign = 'left';
      ctx.fillText(`${emoji} ${title}`, 80, y);

      ctx.font = '28px Roboto';
      for (let i = 0; i < data.length; i++) {
        const entry = data[i];
        let name = 'Utente sconosciuto';
        try {
          const member = await interaction.guild.members.fetch(entry.id);
          name = member.displayName.length > 20 ? member.displayName.slice(0, 17) + '...' : member.displayName;
        } catch { }

        const medal = i === 0 ? 'First' : i === 1 ? 'Second' : 'Third';
        const value = isTime ? `${entry.value} min` : `${entry.value} msg`;

        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${medal} ${name}`, 100, y + 60 + i * 60);
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '24px Roboto';
        ctx.fillText(value, 650, y + 60 + i * 60);
      }

      // Se meno di 3, metti placeholder
      for (let i = data.length; i < 3; i++) {
        ctx.fillStyle = '#444444';
        ctx.font = '26px Roboto';
        ctx.fillText(i === 0 ? 'First' : i === 1 ? 'Second' : 'Third' + ' —', 100, y + 60 + i * 60);
      }
    };

    await drawSection('TOP MESSAGGI', 'Message', 160, topMsg);
    await drawSection('TOP VOCE', 'Microphone', 360, topVoice, true);

    // Pie piccolo con data
    ctx.fillStyle = '#666666';
    ctx.font = '20px Roboto';
    ctx.textAlign = 'center';
    ctx.fillText(`Aggiornato il ${new Date().toLocaleDateString('it-IT')}`, 450, 570);

    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.png' });

    await interaction.editReply({ files: [attachment] });
  },
};