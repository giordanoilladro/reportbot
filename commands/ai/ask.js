// commands/ai/ask.js
const { SlashCommandBuilder } = require('discord.js');
const { Groq } = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROk_API_KEY   // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  // IMPORTANTE: usa GROQ_API_KEY (con la Q), non GROK_API_KEY!
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
        model: "llama3-70b-8192",           // ultra veloce e intelligente
        // model: "mixtral-8x7b-32768",     // sblocca se vuoi più cattiveria
        temperature: 0.9,
        max_tokens: 1024,
      });

      const risposta = completion.choices[0].message.content;

      // Gestisce risposte lunghe (Discord max 2000 caratteri)
      if (risposta.length > 1990) {
        const parti = risposta.match(/.{1,1990}/gs);
        await interaction.editReply(`**Domanda:** ${domanda}\n\n**Risposta:** ${parti[0]}...`);
        for (let i = 1; i < parti.length; i++) {
          await interaction.followUp({ content: parti[i], ephemeral: false });
        }
      } else {
        await interaction.editReply(`**Domanda:** ${domanda}\n\n**Risposta:** ${risposta}`);
      }

    } catch (error) {
      console.error("Errore Groq:", error);
      await interaction.editReply("Il mio cervello da criceto ha crashato. Riprova fra 5 secondi");
    }
  },
};