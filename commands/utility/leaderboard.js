const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const Guild = require('../../models/Guild');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Mostra la classifica messaggi + voce del server'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const guildData = await Guild.findOne({ guildId: interaction.guild.id });
      
      if (!guildData || 
          (guildData.messages?.size || 0) === 0 && 
          (guildData.voiceTime?.size || 0) === 0) {
        return interaction.editReply({
          content: '📊 **Nessun dato registrato ancora!**\n\n' +
                   '• Scrivi qualche messaggio\n' +
                   '• Parla un po\' in voice\n' +
                   'Poi riprova! 🎯'
        });
      }

      // Top 3 messaggi
      const topMsg = [...(guildData.messages?.entries() || [])]
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // Top 3 voce (minuti)
      const topVoice = [...(guildData.voiceTime?.entries() || [])]
        .map(([id, seconds]) => ({ id, minutes: Math.floor(seconds / 60) }))
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 3);

      // Canvas 1000x700 (spazioso e bello)
      const canvas = createCanvas(1000, 700);
      const ctx = canvas.getContext('2d');

      // SFONDO GRADIENTE FIGO
      const gradient = ctx.createLinearGradient(0, 0, 0, 700);
      gradient.addColorStop(0, '#0f0f23');
      gradient.addColorStop(0.5, '#1a1a3e');
      gradient.addColorStop(1, '#0d1117');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1000, 700);

      // BORDI ARROTONDATI (effetto card)
      ctx.strokeStyle = '#7289da';
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, 960, 660);

      // TITOLO SERVER
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 60px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#7289da';
      ctx.shadowBlur = 10;
      ctx.fillText(interaction.guild.name, 500, 100);
      ctx.shadowBlur = 0; // reset

      // SOTTOTITOLO
      ctx.fillStyle = '#7289da';
      ctx.font = 'bold 40px Arial, sans-serif';
      ctx.fillText('🏆 LEADERBOARD', 500, 160);

      // LINEA DIVISORIA
      ctx.strokeStyle = '#7289da';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 180);
      ctx.lineTo(950, 180);
      ctx.stroke();

      // FUNZIONE PER DISEGNARE SEZIONE (TOP MESSAGGI)
      const drawSection = async (title, emoji, startY, data, isVoice = false) => {
        // Titolo sezione
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 45px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${emoji} ${title}`, 80, startY + 30);

        // Linea sotto titolo
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(70, startY + 45);
        ctx.lineTo(300, startY + 45);
        ctx.stroke();

        // POSIZIONI POSIZIONI
        const positions = ['🥇 1st', '🥈 2nd', '🥉 3rd'];
        
        for (let i = 0; i < 3; i++) {
          const y = startY + 90 + (i * 90);
          const entry = data[i];
          
          // Medaglia e posizione
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 32px Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(positions[i], 100, y);

          if (entry) {
            // Nome utente
            let name = 'Utente Sconosciuto';
            try {
              const member = await interaction.guild.members.fetch(entry.id).catch(() => null);
              if (member) {
                name = member.displayName.length > 25 ? 
                       member.displayName.substring(0, 22) + '...' : 
                       member.displayName;
              }
            } catch {}

            ctx.fillStyle = '#e6e6fa';
            ctx.font = 'bold 28px Arial, sans-serif';
            ctx.fillText(name, 120, y + 25);

            // Valore (messaggi o minuti)
            const value = isVoice ? 
                         `${entry.minutes} min` : 
                         `${entry.count} msg`;
            
            ctx.fillStyle = '#00ff88';
            ctx.font = 'bold 32px Arial, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(value, 850, y + 25);
            ctx.textAlign = 'left';
          } else {
            // Vuoto
            ctx.fillStyle = '#666666';
            ctx.font = 'italic 24px Arial, sans-serif';
            ctx.fillText('— Nessun dato —', 120, y + 25);
          }
        }
      };

      // DISEGNA SEZIONI
      await drawSection('TOP MESSAGGI', '💬', 200, topMsg, false);
      await drawSection('TOP VOCE', '🎤', 420, topVoice, true);

      // FOOTER
      ctx.fillStyle = '#888888';
      ctx.font = 'italic 20px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Aggiornato: ${new Date().toLocaleDateString('it-IT')} | ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`,
        500, 670
      );

      // OUTPUT IMMAGINE
      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.png' });
      
      await interaction.editReply({ 
        content: '🏆 **Classifica del server aggiornata!**', 
        files: [attachment] 
      });

    } catch (error) {
      console.error('Errore leaderboard:', error);
      await interaction.editReply('❌ Errore nella creazione della leaderboard. Riprova!');
    }
  }
};