// commands/ai/ask.js
const { SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { Groq } = require('groq-sdk');
const User = require('../../models/User'); // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
const personalities = require('../../utils/personalities'); // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// System prompt di fallback (se qualcosa va storto)
const defaultPrompt = personalities.tossico;

// Funzione condivisa per generare la risposta in base alla modalità dell'utente
async function generaRisposta(domanda, interaction) {
  await interaction.deferReply();

  const userId = interaction.user.id;

  // Recupera la modalità personale dell'utente
  let userMode = 'tossico'; // default
  try {
    const userDoc = await User.findOne({ userId });
    if (userDoc && userDoc.personalityMode) {
      userMode = userDoc.personalityMode;
    }
  } catch (err) {
    console.error("Errore nel recupero modalità utente:", err);
    // continua con default, non blocca il comando
  }

  const systemPrompt = personalities[userMode] || defaultPrompt;

  // Opzionale: per la modalità "serio" riduciamo la creatività
  const temperature = userMode === 'serio' ? 0.6 : 0.9;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: domanda
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature,
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

    // Messaggi di errore adattati alla modalità (ma per semplicità usiamo quelli tossici di default)
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
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Parla con Hamster Bot IA (modalità personale: usa /hamstermode per cambiarla)')
    .addStringOption(option =>
      option
        .setName('domanda')
        .setDescription('La tua domanda o frase per il criceto')
        .setRequired(true)
    ),

  contextMenu: new ContextMenuCommandBuilder()
    .setName('Chiedi a Hamster Bot')
    .setType(ApplicationCommandType.Message),

  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const domanda = interaction.options.getString('domanda');
      await generaRisposta(domanda, interaction);
    }
    else if (interaction.isMessageContextMenuCommand()) {
      const messaggio = interaction.targetMessage;

      let domanda = messaggio.content.trim();

      if (!domanda) {
        domanda = "[Questo messaggio non ha testo, probabilmente è un embed, un giveaway o un'immagine... descrivimelo tu, mortale]";
      }

      // Contesto adattato alla modalità (ma lasciamo generico, il system prompt farà il resto)
      domanda = `Analizza e rispondi a questo messaggio di ${messaggio.author.username}: "${domanda}"`;

      await generaRisposta(domanda, interaction);
    }
  },
};