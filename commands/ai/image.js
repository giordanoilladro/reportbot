require('dotenv').config(); // Carica le variabili dal .env

const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { OpenAI } = require('openai');
const axios = require('axios');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const TOKEN = process.env.DISCORD_TOKEN;
const EVOLINK_API_KEY = process.env.EVOLINK_API_KEY;

if (!TOKEN || !EVOLINK_API_KEY) {
    console.error('Errore: Mancano DISCORD_TOKEN o EVOLINK_API_KEY nel file .env');
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: EVOLINK_API_KEY,
    baseURL: 'https://api.evolink.ai/v1'
});

// Slash command
const commands = [
    new SlashCommandBuilder()
        .setName('image')
        .setDescription('Genera un\'immagine AI')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Descrizione (opzionale "prompt: testo")')
                .setRequired(true))
];

client.once('ready', async () => {
    console.log(`Bot pronto come ${client.user.tag}`);
    await client.application.commands.set(commands);
});

async function generaImmagine(prompt) {
    try {
        const response = await openai.images.generate({
            model: "gpt-4o-image", // Cambia con "doubao-seedream-4.0", "gpt-image-1.5" ecc. se preferisci
            prompt: prompt,
            n: 1,
            size: "1024x1024"
        });

        const taskId = response.id; // EvoLink restituisce direttamente { id: "task-..." }
        if (!taskId) {
            throw new Error('Nessun task ID ricevuto');
        }

        // Polling per aspettare il risultato (max ~60 secondi)
        let results = null;
        for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const taskStatus = await axios.get(`https://api.evolink.ai/v1/tasks/${taskId}`, {
                headers: { Authorization: `Bearer ${EVOLINK_API_KEY}` }
            });

            if (taskStatus.data.status === 'completed') {
                results = taskStatus.data.results;
                break;
            } else if (taskStatus.data.status === 'failed') {
                throw new Error('Task fallito');
            }
        }

        if (results && results.length > 0) {
            return results[0]; // Primo URL dell'immagine
        } else {
            throw new Error('Timeout: immagine non generata in tempo');
        }
    } catch (error) {
        console.error('Errore generazione immagine:', error.message || error);
        return null;
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'image') {
        await interaction.deferReply();

        let prompt = interaction.options.getString('prompt');
        if (prompt.toLowerCase().startsWith('prompt:')) {
            prompt = prompt.slice(7).trim();
        }

        const imageUrl = await generaImmagine(prompt);

        if (imageUrl) {
            const embed = new EmbedBuilder()
                .setTitle('Immagine generata!')
                .setImage(imageUrl)
                .setFooter({ text: `Prompt: ${prompt} | Powered by EvoLink.ai` })
                .setColor('#00FF00');

            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply('Errore nella generazione dell\'immagine. Riprova più tardi!');
        }
    }
});

// Handler per mention @bot
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.mentions.has(client.user)) {
        const content = message.content.replace(`<@${client.user.id}>`, '').trim();

        if (content) {
            await message.channel.sendTyping();

            const imageUrl = await generaImmagine(content);

            if (imageUrl) {
                const embed = new EmbedBuilder()
                    .setImage(imageUrl)
                    .setFooter({ text: `Prompt: ${content} | EvoLink.ai` })
                    .setColor('#00FF00');

                await message.reply({ embeds: [embed] });
            } else {
                await message.reply('Errore nella generazione dell\'immagine. Riprova!');
            }
        } else {
            await message.reply('Hey! Dimmi cosa vuoi generare, es: `@IlTuoBot un criceto volante`');
        }
    }
});

client.login(TOKEN);