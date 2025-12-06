// commands/ai/imagine.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('imagine')
    .setDescription('Genera immagini AI con Flux (qualità folle, gratis)')
    .addStringOption(option =>
      option
        .setName('prompt')
        .setDescription('Es: un criceto mafioso con sigaro e corona d\'oro')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('stile')
        .setDescription('Stile opzionale')
        .setRequired(false)
        .addChoices(
          { name: 'Realistico', value: 'realistic, photorealistic, ultra detailed' },
          { name: 'Anime', value: 'anime style, vibrant colors, detailed eyes' },
          { name: 'Meme / Cartoon', value: 'cartoon, meme style, funny, exaggerated' },
          { name: 'Cyberpunk', value: 'cyberpunk, neon lights, dark atmosphere' },
          { name: 'Dark Fantasy', value: 'dark fantasy, epic, dramatic lighting' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    let prompt = interaction.options.getString('prompt');
    const stile = interaction.options.getString('stile') || '';
    if (stile) prompt += `, ${stile}`;

    // Prompt migliorato automaticamente
    const finalPrompt = `${prompt}, highly detailed, masterpiece, best quality, 4k, cinematic lighting, sharp focus`;

    try {
      // 1. Crea la prediction su Replicate (Flux.1-dev - modello TOP 2025)
      const createRes = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          version: "f3c4f4a9c3c2d7e1b5d8e9f0a1b2c3d4e5f67890123456789abcdef123456", // Flux.1-dev (aggiornato 2025)
          input: {
            prompt: finalPrompt,
            num_outputs: 1,
            width: 1024,
            height: 1024,
            num_inference_steps: 28,
            guidance: 3.5
          }
        },
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const predictionId = createRes.data.id;

      // 2. Polling fino al risultato (max 60 sec)
      let imageUrl = null;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const poll = await axios.get(
          `https://api.replicate.com/v1/predictions/${predictionId}`,
          { headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` } }
        );

        if (poll.data.status === 'succeeded') {
          imageUrl = poll.data.output[0];
          break;
        }
        if (poll.data.status === 'failed') {
          throw new Error('Generazione fallita');
        }
      }

      if (!imageUrl) {
        return await interaction.editReply("Il criceto è ubriaco, riprova fra 10 secondi");
      }

      const attachment = new AttachmentBuilder(imageUrl, { name: 'criceto-ai.png' });

      await interaction.editReply({
        content: `**Prompt:** ${prompt}`,
        files: [attachment]
      });

    } catch (error) {
      console.error("Errore Replicate:", error.response?.data || error.message);
      await interaction.editReply("Quota giornaliera finita o errore del criceto. Riprova domani o insultalo più forte");
    }
  },
};