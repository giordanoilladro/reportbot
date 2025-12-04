// commands/utility/leaderboard.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const Guild = require('../../models/Guild');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Classifica completa del server – 4 sezioni'),

  async execute(interaction) {
    await interaction.deferReply();

    const guildData = await Guild.findOne({ guildId: interaction.guild.id });

    // Protezione totale
    const messages         = guildData?.messages         ?? new Map();
    const voiceTime        = guildData?.voiceTime        ?? new Map();
    const channelMessages  = guildData?.channelMessages  ?? new Map();
    const voiceChannelTime = guildData?.voiceChannelTime ?? new Map();

    // Top 5 per ogni sezione
    const topUsersMsg = [...messages.entries()].map(([id, c]) => ({ id, count: c })).sort((a, b) => b.count - a.count).slice(0, 5);
    const topTextChannels = [...channelMessages.entries()].map(([id, c]) => ({ id, count: c })).sort((a, b) => b.count - a.count).slice(0, 5);
    const topVoiceUsers = [...voiceTime.entries()].map(([id, s]) => ({ id, minutes: Math.floor(s / 60) })).sort((a, b) => b.minutes - a.minutes).slice(0, 5);
    const topVoiceChannels = [...voiceChannelTime.entries()].map(([id, s]) => ({ id, minutes: Math.floor(s / 60) })).sort((a, b) => b.minutes - a.minutes).slice(0, 5);

    const canvas = createCanvas(1100, 1600);
    const ctx = canvas.getContext('2d');

    // Sfondo
    const bg = ctx.createLinearGradient(0, 0, 0, 1600);
    bg.addColorStop(0, '#0a001a');
    bg.addColorStop(1, '#000814');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1100, 1600);

    // Stelle
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.random() * 1100, Math.random() * 1600, 1.5, 1.5);
    }

    let y = 100;

    const drawBox = async (title, emoji, color, data, isChannel) => {
      ctx.fillStyle = 'rgba(20, 10, 50, 0.85)';
      ctx.fillRect(50, y, 1000, 340);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.strokeRect(50, y, 1000, 340);

      ctx.fillStyle = color;
      ctx.font = 'bold 50px "DejaVu Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${emoji} ${title}`, 550, y + 60);

      for (let i = 0; i < 5; i++) {
        const entry = data[i];
        const lineY = y + 110 + i * 55;

        // Posizione (1st, 2nd, 3rd, 4th, 5th)
        let positionText = '';
        let positionColor = '#ffffff';
        if (i === 0) { positionText = '1st'; positionColor = '#ffd700'; }
        else if (i === 1) { positionText = '2nd'; positionColor = '#c0c0c0'; }
        else if (i === 2) { positionText = '3rd'; positionColor = '#cd7f32'; }
        else { positionText = `${i + 1}th`; }

        ctx.fillStyle = positionColor;
        ctx.font = '42px "DejaVu Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(positionText, 80, lineY);

        // Nome
        let name = '—';
        if (entry) {
          if (isChannel) {
            const ch = interaction.guild.channels.cache.get(entry.id);
            name = ch?.name || 'Canale eliminato';
          } else {
            try {
              const member = await interaction.guild.members.fetch(entry.id).catch(() => null);
              name = member?.displayName || 'Utente uscito';
            } catch { name = 'Utente uscito'; }
          }
          name = name.length > 28 ? name.slice(0, 25) + '...' : name;
        }

        ctx.fillStyle = '#e0e0ff';
        ctx.font = '38px "DejaVu Sans", sans-serif';
        ctx.fillText(name, 180, lineY);

        // Valore
        let value = '—';
        if (entry) {
          if (title.includes('MESSAGGI') || title.includes('TESTO')) {
            value = entry.count ? `${entry.count} msg` : `${entry.minutes} min`;
          } else {
            value = `${entry.minutes} min`;
          }
        }

        ctx.fillStyle = color;
        ctx.textAlign = 'right';
        ctx.fillText(value, 980, lineY);
        ctx.textAlign = 'left';
      }
      y += 380;
    };

    await drawBox('TOP MESSAGGI UTENTI', '💬', '#60a5fa', topUsersMsg, false);
    await drawBox('CANALI TESTO PIÙ ATTIVI', '📝', '#f87171', topTextChannels, true);
    await drawBox('TOP TEMPO IN VOCE', '🎤', '#34d399', topVoiceUsers, false);
    await drawBox('CANALI VOCE PIÙ USATI', '🔊', '#fbbf24', topVoiceChannels, true);

    // Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '32px "DejaVu Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${interaction.guild.name} • ${interaction.guild.memberCount} membri • ${new Date().toLocaleDateString('it-IT')}`, 550, 1580);

    const buffer = canvas.toBuffer('image/png');
    await interaction.editReply({
      content: '🏆 **CLASSIFICA COMPLETA DEL SERVER**',
      files: [new AttachmentBuilder(buffer, { name: 'leaderboard.png' })]
    });
  }
};