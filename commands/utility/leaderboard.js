const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const Guild = require('../../models/Guild');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Classifica completa del server – 4 sezioni'),

  async execute(interaction) {
    await interaction.deferReply();

    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || {
      messages: new Map(),
      voiceTime: new Map(),
      channelMessages: new Map(),   // canaleId → conteggio
      voiceChannelTime: new Map()   // canaleId → secondi totali
    };

    // 1. Top 5 utenti messaggi
    const topUsersMsg = [...guildData.messages.entries()]
      .map(([id, c]) => ({ id, count: c }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 2. Top 5 canali testo per messaggi
    const topTextChannels = [...guildData.channelMessages.entries()]
      .map(([id, c]) => ({ id, count: c }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 3. Top 5 utenti tempo voce
    const topVoiceUsers = [...guildData.voiceTime.entries()]
      .map(([id, s]) => ({ id, minutes: Math.floor(s / 60) }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    // 4. Top 5 canali voce per tempo totale
    const topVoiceChannels = [...guildData.voiceChannelTime.entries()]
      .map(([id, s]) => ({ id, minutes: Math.floor(s / 60) }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    const canvas = createCanvas(1100, 1600);
    const ctx = canvas.getContext('2d');

    // Sfondo stellato premium
    const bg = ctx.createLinearGradient(0, 0, 0, 1600);
    bg.addColorStop(0, '#0a001a');
    bg.addColorStop(1, '#000000');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1100, 1600);

    // Stelle
    for (let i = 0; i < 250; i++) {
      ctx.fillStyle = 'white';
      ctx.fillRect(Math.random()*1100, Math.random()*1600, 1.5, 1.5);
    }

    let y = 80;

    const drawBox = async (title, emoji, color, data, type) => {
      // Card
      ctx.fillStyle = 'rgba(20, 10, 50, 0.8)';
      ctx.fillRect(50, y, 1000, 340);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.strokeRect(50, y, 1000, 340);

      // Titolo
      ctx.fillStyle = color;
      ctx.font = 'bold 48px DejaVu Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${emoji} ${title}`, 550, y + 60);

      for (let i = 0; i < 5; i++) {
        const entry = data[i];
        const lineY = y + 110 + i * 50;

        // Posizione
        ctx.fillStyle = i < 3 ? ['#ffd700','#c0c0c0','#cd7f32'][i] : '#ffffff';
        ctx.font = '40px DejaVu Sans';
        ctx.textAlign = 'left';
        ctx.fillText(i===0?'1st':i===1?'2nd':i===2?'3rd':`${i+1}th`, 80, lineY);

        if (entry) {
          let name = '—';
          if (type === 'user') {
            try {
              const member = await interaction.guild.members.fetch(entry.id).catch(()=>null);
              name = member?.displayName || 'Utente uscito';
            } catch {}
          } else {
            const channel = interaction.guild.channels.cache.get(entry.id);
            name = channel?.name || 'Canale eliminato';
          }
          name = name.length > 28 ? name.slice(0,25)+'...' : name;

          ctx.fillStyle = '#e0e0ff';
          ctx.font = '36px DejaVu Sans';
          ctx.fillText(name, 180, lineY);

          const value = type === 'msg' ? `${entry.count.toLocaleString()} msg` :
                       `${entry.minutes.toLocaleString()} min`;

          ctx.fillStyle = color;
          ctx.textAlign = 'right';
          ctx.fillText(value, 980, lineY);
          ctx.textAlign = 'left';
        }
      }

      y += 380;
    };

    // DISEGNA LE 4 SEZIONI
    await drawBox('TOP MESSAGGI UTENTI', 'Message', '#60a5fa', topUsersMsg, 'user msg');
    await drawBox('CANALI TESTO PIÙ ATTIVI', 'Text', '#f87171', topTextChannels, 'channel msg');
    await drawBox('TOP TEMPO IN VOCE', 'Microphone', '#34d399', topVoiceUsers, 'user');
    await drawBox('CANALI VOCE PIÙ USATI', 'Speaker', '#fbbf24', topVoiceChannels, 'channel');

    // Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '30px DejaVu Sans';
    ctx.textAlign = 'center';
    ctx.fillText(`Server: ${interaction.guild.name} • ${interaction.guild.memberCount} membri • ${new Date().toLocaleDateString('it-IT')}`, 550, 1580);

    const buffer = canvas.toBuffer('image/png');
    await interaction.editReply({
      content: '**CLASSIFICA COMPLETA DEL SERVER**',
      files: [new AttachmentBuilder(buffer, { name: 'leaderboard-4sez.png' })]
    });
  }
};