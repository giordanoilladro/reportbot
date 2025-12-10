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
      // NUOVA API REPLICATE 2025 per Flux
      const response = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          version: "2569839d1d429f1046bed3da86f90cb84f77cf95d356f5a2f2a4c2e113f9c275", // Flux.1-dev dicembre 2025 (aggiornata!)
          // oppure usa direttamente il modello così (ancora più semplice):
          // model: "black-forest-labs/flux-dev",
          
          input: {
            prompt: finalPrompt,
            num_outputs: 1,
            aspect_ratio: "1:1",       // sostituisce width/height
            output_format: "png",
            guidance: 3.5,
            num_inference_steps: 28
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json',
            // 'Prefer': 'wait' // <-- USA QUESTO per avere la risposta immediata (più veloce!)
          }
        }
      );

      let prediction = response.data;

      // Se usi 'Prefer: wait', hai direttamente l'output!
      if (response.headers['replicate-prefer']?.includes('wait') || prediction.status === 'succeeded') {
        const imageUrl = prediction.output[0];
        const attachment = new AttachmentBuilder(imageUrl, { name: 'flux-criceto.png' });

        return await interaction.editReply({
          content: `**Prompt:** ${prompt}`,
          files: [attachment]
        });
      }

      // Altrimenti polling classico (vecchio metodo)
      const predictionId = prediction.id;
      let imageUrl = null;

      for (let i = 0; i < 25; i++) {
        await new Promise(r => setTimeout(r, 2500));

        const poll = await axios.get(
          `https://api.replicate.com/v1/predictions/${predictionId}`,
          { headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` } }
        );

        if (poll.data.status === 'succeeded') {
          imageUrl = poll.data.output[0];
          break;
        }
        if (poll.data.status === 'failed') {
          throw new Error(poll.data.error || 'Generazione fallita');
        }
      }

      if (!imageUrl) {
        return await interaction.editReply("Il criceto è andato in ferie, riprova fra un po' 🌴");
      }

      const attachment = new AttachmentBuilder(imageUrl, { name: 'flux-criceto.png' });
      await interaction.editReply({
        content: `**Prompt:** ${prompt}`,
        files: [attachment]
      });

    } catch (error) {
      console.error("Errore Flux:", error.response?.data || error.message);
      await interaction.editReply("Errore del criceto AI. Probabilmente quota esaurita o prompt vietato.\nRiprova fra un'ora o cambia parole magiche 🔮");
    }
  },
};