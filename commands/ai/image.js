// commands/ai/imagine.js
const { AttachmentBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  name: 'imagine',
  description: 'Genera immagini AI gratuite con Flux (alternativa a Leonardo)',
  options: [{
    name: 'prompt',
    type: 3,
    description: 'Descrizione (es: "un criceto mafioso con corona")',
    required: true
  }],

  async execute(interaction) {
    await interaction.deferReply();
    const prompt = interaction.options.getString('prompt') + ', highly detailed, 4k, cinematic lighting';

    try {
      const response = await axios.post('https://api.replicate.com/v1/predictions', {
        version: 'ac5494c1b6b684a43e6c3b9e0a6c5f5f5f5f5f5f5f5f5f5f5f5f5f5f',  // ID Flux model 2025 (copia da replicate.com/flux)
        input: {
          prompt: prompt,
          num_outputs: 1,
          width: 1024,
          height: 1024
        }
      }, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const predictionId = response.data.id;
      
      // Poll per risultato (Replicate è async)
      let result;
      while (!result) {
        await new Promise(r => setTimeout(r, 3000));  // Check ogni 3 sec
        const poll = await axios.get(`https://api.replicate.com/v1/predictions/${predictionId}`, {
          headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` }
        });
        if (poll.data.status === 'succeeded') {
          result = poll.data.output[0];
          break;
        }
      }

      const attachment = new AttachmentBuilder(result, { name: 'ai-image.png' });
      await interaction.editReply({ content: `Ecco la tua immagine: "${prompt}"`, files: [attachment] });

    } catch (error) {
      await interaction.editReply('Errore generazione: quota finita o prompt troppo pazzo. Prova con Hugging Face!');
    }
  }
};