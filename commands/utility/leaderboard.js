// commands/utility/leaderboard.js – VERSIONE LEGGIBILE, BELLA E DEFINITIVA
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
    const topUsersMsg      = [...messages.entries()].map(([id,c])=>({id,count:c})).sort((a,b)=>b.count-a.count).slice(0,5);
    const topTextChannels  = [...channelMessages.entries()].map(([id,c])=>({id,count:c})).sort((a,b)=>b.count-a.count).slice(0,5);
    const topVoiceUsers    = [...voiceTime.entries()].map(([id,s])=>({id,minutes:Math.floor(s/60)})).sort((a,b)=>b.minutes-a.minutes).slice(0,5);
    const topVoiceChannels = [...voiceChannelTime.entries()].map(([id,s])=>({id,minutes:Math.floor(s/60)})).sort((a,b)=>b.minutes-a.minutes).slice(0,5);

    const canvas = createCanvas(1100, 1700);
    const ctx = canvas.getContext('2d');

    // Sfondo galattico
    const bg = ctx.createLinearGradient(0, 0, 0, 1700);
    bg.addColorStop(0, '#0a001a');
    bg.addColorStop(1, '#000814');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1100, 1700);

    // Stelle
    for (let i = 0; i < 350; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = Math.random() * 0.8 + 0.2;
      ctx.fillRect(Math.random() * 1100, Math.random() * 1700, 2, 2);
    }
    ctx.globalAlpha = 1;

    let y = 80;

    const drawBox = async (title, emoji, color, data, isChannel) => {
      // Box con sfondo semi-trasparente
      ctx.fillStyle = 'rgba(15, 10, 40, 0.92)';
      ctx.fillRect(50, y, 1000, 380);
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.strokeRect(50, y, 1000, 380);

      // Titolo con glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = color;
      ctx.font = 'bold 62px "DejaVu Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${emoji} ${title}`, 550, y + 80);
      ctx.shadowBlur = 0;

      for (let i = 0; i < 5; i++) {
        const entry = data[i];
        const lineY = y + 140 + i * 70;

        // Medaglia grande
        const positions = ['1st', '2nd', '3rd', '4th', '5th'];
        const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32', '#ffffff', '#ffffff'];
        ctx.fillStyle = medalColors[i];
        ctx.font = 'bold 56px "DejaVu Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(positions[i], 70, lineY);

        // Nome utente/canale – BIANCO FISSO, sempre leggibile
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
          name = name.length > 32 ? name.substring(0, 29) + '...' : name;
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px "DejaVu Sans", sans-serif';
        ctx.fillText(name, 180, lineY);

        // Valore grande e colorato
        let value = '—';
        if (entry) {
          value = entry.count !== undefined 
            ? `${entry.count.toLocaleString()} msg`
            : `${entry.minutes.toLocaleString()} min`;
        }

        ctx.fillStyle = color;
        ctx.font = 'bold 52px "DejaVu Sans", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(value, 1000, lineY);
        ctx.textAlign = 'left';
      }
      y += 410;
    };

    await drawBox('TOP MESSAGGI UTENTI', 'Message', '#5ea8ff', topUsersMsg, false);
    await drawBox('CANALI TESTO PIÙ ATTIVI', 'Text', '#ff6b6b', topTextChannels, true);
    await drawBox('TOP TEMPO IN VOCE', 'Microphone', '#20e6b8', topVoiceUsers, false);
    await drawBox('CANALI VOCE PIÙ USATI', 'Speaker', '#ffb400', topVoiceChannels, true);

    // Footer bello
    ctx.fillStyle = '#e0e0ff';
    ctx.font = 'bold 36px "DejaVu Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${interaction.guild.name} • ${interaction.guild.memberCount.toLocaleString()} membri • ${new Date().toLocaleDateString('it-IT')}`, 550, y + 60);

    const buffer = canvas.toBuffer('image/png');
    await interaction.editReply({
      content: '**CLASSIFICA COMPLETA DEL SERVER**',
      files: [new AttachmentBuilder(buffer, { name: 'leaderboard.png' })]
    });
  }
};