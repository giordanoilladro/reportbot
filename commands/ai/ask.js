// commands/ai/ask.js
const { SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { Groq } = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  // FIXATO: era scritto GROk_API_KEY (manca la Q!)
});

// Funzione condivisa per generare la risposta tossica (usata sia dallo slash che dal context menu)
async function generaRispostaTossica(domanda, interaction) {
  await interaction.deferReply(); // defer sempre, anche se già fatto fuori

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
      model: "llama-3.3-70b-versatile",
      temperature: 0.9,
      max_tokens: 1024,
    });

    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error("Groq non ha restituito testo valido");
    }

    let risposta = completion.choices[0].message.content.trim();

    const maxLength = 1990;
    if (risposta.length > maxLength) {
      const parti = risposta.match(new RegExp(`.{1,${maxLength}}`, 'gs'));

      await interaction.editReply({
        content: `**Domanda:** ${domanda}\n\n**Risposta del Criceto (1/${parti.length}):**\n${parti[0]}`
      });
      for (let i = 1; i < parti.length; i++) {
        await interaction.followUp({
          content: `**Continua (${i + 1}/${parti.length}):**\n${parti[i]}`,
          ephemeral: false
        });
      }
    } else {
      await interaction.editReply({
        content: `**Domanda:** ${domanda}\n\n**Risposta del Criceto:**\n${risposta}`
      });
    }
  } catch (error) {
    console.error("Errore Groq nel comando ask:", error.message || error);
    const erroriTossici = [
      "Il mio cervello da criceto ha preso fuoco, riprova fra 5 secondi",
      "Groq mi ha bloccato... sono troppo mafioso anche per loro",
      "L'IA si è spaventata e ha chiuso la connessione",
      "Rate limitato, pure io ho un limite (incredibile)",
      "Errore cosmico: il mio ego ha sovraccaricato il server",
      "Il criceto è in pausa caffè. Torna fra un po'"
    ];
    const rispostaErrore = erroriTossici[Math.floor(Math.random() * erroriTossici.length)];

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: rispostaErrore }).catch(() => {});
    } else {
      await interaction.reply({ content: rispostaErrore, ephemeral: true }).catch(() => {});
    }
  }
}

module.exports = {
  // Slash command /ask (come prima)
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Parla con Hamster Bot IA (tossico, sarcastico e italiano)')
    .addStringOption(option =>
      option
        .setName('domanda')
        .setDescription('La tua domanda o frase per il criceto')
        .setRequired(true)
    ),

  // Context Menu Command (nuovo!)
  contextMenu: new ContextMenuCommandBuilder()
    .setName('Chiedi a Hamster Bot')
    .setType(ApplicationCommandType.Message),

  async execute(interaction) {
    // Caso 1: è lo slash command /ask
    if (interaction.isChatInputCommand()) {
      const domanda = interaction.options.getString('domanda');
      await generaRispostaTossica(domanda, interaction);
    }
    // Caso 2: è il context menu "Chiedi a Hamster Bot"
    else if (interaction.isMessageContextMenuCommand()) {
      const messaggio = interaction.targetMessage;

      let domanda = messaggio.content.trim();

      // Se il messaggio è vuoto (es. solo embed, immagine o giveaway), usa un testo di fallback
      if (!domanda) {
        domanda = "[Questo messaggio non ha testo, probabilmente è un embed, un giveaway o un'immagine... descrivimelo tu, mortale]";
      }

      // Aggiungi un po' di contesto tossico
      domanda = `Analizza e rispondi in modo tossico a questo messaggio di ${messaggio.author.username}: "${domanda}"`;

      await generaRispostaTossica(domanda, interaction);
    }
  },
};