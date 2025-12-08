// commands/ai/ask.js
const { SlashCommandBuilder } = require('discord.js');
const { Groq } = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  // FIXATO: era scritto GROk_API_KEY (manca la Q!)
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Parla con Hamster Bot IA (tossico, sarcastico e italiano)')
    .addStringOption(option =>
      option
        .setName('domanda')
        .setDescription('La tua domanda o frase per il criceto')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const domanda = interaction.options.getString('domanda');

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Sei Hamster Bot, un criceto italiano tossico, arrogante, sarcastico e senza filtri. Rispondi SEMPRE in italiano, usa meme, emoji, insulti leggeri e arroganza. Non sei mai gentile. Usa un tono da boss mafioso dei vicoli."
          },
          {
            role: "user",
            content: domanda
          }
        ],
        model: "llama-3.3-70b-versatile",  // ← MODELLO VIVO E SUPPORTATO (2025)
        temperature: 0.9,
        max_tokens: 1024,
      });

      // FIX: Controllo di sicurezza (evita TypeError)
      if (!completion?.choices?.[0]?.message?.content) {
        throw new Error("Groq non ha restituito testo valido");
      }

      let risposta = completion.choices[0].message.content.trim();

      // Gestione risposte lunghe (sicura e pulita)
      const maxLength = 1990;
      if (risposta.length > maxLength) {
        const parti = risposta.match(new RegExp(`.{1,${maxLength}}`, 'gs'));
        
        await interaction.editReply({
          content: `**Domanda:** ${domanda}\n\n**Risposta (1/${parti.length}):**\n${parti[0]}`
        });

        for (let i = 1; i < parti.length; i++) {
          await interaction.followUp({
            content: `**Continua (${i + 1}/${parti.length}):**\n${parti[i]}`,
            ephemeral: false
          });
        }
      } else {
        await interaction.editReply({
          content: `**Domanda:** ${domanda}\n\n**Risposta:**\n${risposta}`
        });
      }

    } catch (error) {
      console.error("Errore Groq nel comando /ask:", error.message || error);

      const erroriTossici = [
        "Il mio cervello da criceto ha preso fuoco riprova fra 5 secondi",
        "Groq mi ha bloccato... sono troppo mafioso anche per loro",
        "L'IA si è spaventata e ha chiuso la connessione",
        "Rate limitato, pure io ho un limite (incredibile)",
        "Errore cosmico: il mio ego ha sovraccaricato il server",
        "Il criceto è in pausa caffè. Torna fra un po'"
      ];

      const rispostaErrore = erroriTossici[Math.floor(Math.random() * erroriTossici.length)];

      await interaction.editReply({
        content: rispostaErrore
      }).catch(() => {
        interaction.followUp({ content: rispostaErrore, ephemeral: true }).catch(() => {});
      });
    }
  },
};