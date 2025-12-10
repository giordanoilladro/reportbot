// commands/ai/imagine.js
const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('imagine')
    .setDescription('Genera immagini AI con Gemini (gratis, alta qualità)')
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
          { name: 'Realistico', value: 'realistic, photorealistic' },
          { name: 'Anime', value: 'anime style, vibrant colors' },
          { name: 'Meme / Cartoon', value: 'cartoon, funny, exaggerated' },
          { name: 'Cyberpunk', value: 'cyberpunk, neon lights, dark' },
          { name: 'Dark Fantasy', value: 'dark fantasy, epic, dramatic' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    let prompt = interaction.options.getString('prompt');
    const stile = interaction.options.getString('stile') || '';
    if (stile) prompt += `, ${stile}`;

    const finalPrompt = `Create a picture of: ${prompt}. Highly detailed, masterpiece, best quality.`;

    try {
      // Chiamata API Gemini 2025 (modello con image generation)
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          contents: [
            {
              parts: [
                { text: finalPrompt }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE']  // ← Abilita output immagine
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const data = response.data;
      const candidate = data.candidates?.[0];
      if (!candidate || !candidate.content?.parts?.[0]?.inlineData) {
        throw new Error('Nessuna immagine generata – riprova con un prompt diverso.');
      }

      const imageBase64 = candidate.content.parts[0].inlineData.data;
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'gemini-image.png' });

      await interaction.editReply({
        content: `**Prompt:** ${prompt}\n*(Generato con Gemini AI – gratis!)*`,
        files: [attachment]
      });

    } catch (error) {
      console.error('Errore Gemini:', error.response?.data || error.message);
      await interaction.editReply({
        content: `Errore: ${error.response?.data?.error?.message || error.message}\nRiprova o controlla la quota free.`,
        flags: [MessageFlags.Ephemeral]
      });
    }
  },
};