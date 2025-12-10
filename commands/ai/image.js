// commands/ai/imagine.js
const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('imagine')
    .setDescription('Genera immagini AI con Flux (qualità folle, gratis, illimitato)')
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
          { name: 'Realistico', value: 'realistic, photorealistic, ultra detailed, sharp focus' },
          { name: 'Anime', value: 'anime style, detailed anime artwork, vibrant colors' },
          { name: 'Meme / Cartoon', value: 'cartoon, meme style, exaggerated features, funny' },
          { name: 'Cyberpunk', value: 'cyberpunk, neon lights, rain, dark atmosphere' },
          { name: 'Dark Fantasy', value: 'dark fantasy, epic, dramatic lighting, highly detailed' }
        )
    ),

  async execute(interaction) {
    // DEFER IMMEDIATO (evita Unknown interaction)
    await interaction.deferReply();

    let prompt = interaction.options.getString('prompt');
    const stile = interaction.options.getString('stile') || '';
    if (stile) prompt += `, ${stile}`;

    const finalPrompt = `${prompt}, masterpiece, best quality, highly detailed, sharp focus, cinematic lighting`;

    try {
      const response = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          // FIX 2025: SOLO version, NIENTE model!
          version: "black-forest-labs/flux-schnell",
          input: {
            prompt: finalPrompt,
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "png",
            num_inference_steps: 4
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json',
            'Prefer': 'wait' // immagine pronta in 4-8 secondi, niente polling inutile
          },
          timeout: 30000 // 30s timeout anti-crash
        }
      );

      const data = response.data;

      // Con 'Prefer: wait' + flux-schnell l'immagine è quasi sempre pronta subito
      if (data.status === "succeeded" && data.output?.[0]) {
        const imageUrl = data.output[0];
        const attachment = new AttachmentBuilder(imageUrl, { name: 'flux-schnell.png' });

        return await interaction.editReply({
          content: `**Prompt:** ${prompt}`,
          files: [attachment]
        });
      }

      // Fallback ultra-raro (solo se Replicate è lentissimo)
      const predictionId = data.id;
      let imageUrl = null;

      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 2500));
        const poll = await axios.get(
          `https://api.replicate.com/v1/predictions/${predictionId}`,
          { 
            headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` },
            timeout: 10000
          }
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
        return await interaction.editReply("Il criceto è scappato... riprova tra 5 secondi! 🐹");
      }

      const attachment = new AttachmentBuilder(imageUrl, { name: 'flux-schnell.png' });
      await interaction.editReply({
        content: `**Prompt:** ${prompt}`,
        files: [attachment]
      });

    } catch (error) {
      console.error("Errore Flux:", error.response?.data || error.message);

      const errorMsg = error.response?.data?.detail || error.message || "Errore sconosciuto";

      // FIX warning ephemeral: usa flags solo se necessario
      if (interaction.deferred) {
        await interaction.editReply({
          content: `Errore del criceto:\n\`\`\`${errorMsg}\`\`\``,
          flags: [MessageFlags.Ephemeral]
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: `Errore del criceto:\n\`\`\`${errorMsg}\`\`\``,
          flags: [MessageFlags.Ephemeral]
        }).catch(() => {});
      }
    }
  },
};