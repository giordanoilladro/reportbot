// commands/ai/imagine.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('imagine')
    .setDescription('Genera immagini AI con Flux (qualità folle, gratis)')
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('Es: un criceto mafioso con sigaro e corona d\'oro')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('stile')
        .setDescription('Stile opzionale')
        .setRequired(false)
        .addChoices(
          { name: 'Realistico', value: 'realistic, photorealistic, ultra detailed, sharp focus' },
          { name: 'Anime', value: 'anime style, detailed anime artwork, vibrant colors' },
          { name: 'Meme / Cartoon', value: 'cartoon, meme style, exaggerated features, funny' },
          { name: 'Cyberpunk', value: 'cyberpunk, neon lights, rain, dark atmosphere' },
          { name: 'Dark Fantasy', value: 'dark fantasy, epic, dramatic lighting, highly detailed' }
        )),

  async execute(interaction) {
    await interaction.deferReply();

    let prompt = interaction.options.getString('prompt');
    const stile = interaction.options.getString('stile') || '';
    if (stile) prompt += `, ${stile}`;

    const finalPrompt = `${prompt}, masterpiece, best quality, highly detailed, sharp focus, cinematic lighting`;

    try {
      // █ LE 3 RIGHE MAGICHE (sostituisci solo da qui...)
      const response = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          model: "black-forest-labs/flux-schnell",           // ← 1ª riga (illimitato)
          input: {
            prompt: finalPrompt,
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "png",
            num_inference_steps: 4                         // ← 2ª riga (4 step = velocissimo)
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json',
            'Prefer': 'wait'                                 // ← 3ª riga (risposta immediata!)
          }
        }
      );
      // ...a qui █

      const prediction = response.data;

      // Con 'Prefer: wait' + Schnell hai quasi sempre l'immagine subito
      if (prediction.status === "succeeded" && prediction.output?.[0]) {
        const imageUrl = prediction.output[0];
        const attachment = new AttachmentBuilder(imageUrl, { name: 'criceto-schnell.png' });

        return await interaction.editReply({
          content: `**Prompt:** ${prompt}`,
          files: [attachment]
        });
      }

      // Fallback (raro con Schnell + wait)
      const predictionId = prediction.id;
      let imageUrl = null;
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const poll = await axios.get(
          `https://api.replicate.com/v1/predictions/${predictionId}`,
          { headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` } }
        );
        if (poll.data.status === 'succeeded') {
          imageUrl = poll.data.output[0];
          break;
        }
        if (poll.data.status === 'failed') throw new Error('Fallito');
      }

      if (!imageUrl) return await interaction.editReply("Il criceto sta correndo a 300 km/h… riprova!");

      const attachment = new AttachmentBuilder(imageUrl, { name: 'criceto-schnell.png' });
      await interaction.editReply({
        content: `**Prompt:** ${prompt}`,
        files: [attachment]
      });

    } catch (error) {
      console.error("Errore Flux:", error.response?.data || error.message);
      await interaction.editReply("Il criceto ha mangiato il cavo Ethernet. Riprova tra 5 secondi ⚡");
    }
  },
};