const { Groq } = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROK_API_KEY });

module.exports = {
  name: 'ask',
  description: 'Parla con l\'IA (Grok-2 ultra veloce)',
  options: [{
    name: 'domanda',
    type: 3,
    description: 'La tua domanda',
    required: true
  }],

  async execute(interaction) {
    await interaction.deferReply();
    const domanda = interaction.options.getString('domanda');

    const risposta = await groq.chat.completions.create({
      messages: [{ role: "user", content: domanda }],
      model: "llama3-70b-8192",  // o "mixtral-8x7b-32768" (più cattivo)
      temperature: 0.8,
      max_tokens: 1024,
    });

    await interaction.editReply({
      content: `**Domanda:** ${domanda}\n\n**Risposta:** ${risposta.choices[0].message.content}`
    });
  }
};