const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch'); // Aggiungi questa riga se necessario

const VIP_ROLE_ID = '1413894001312006316'; // Sostituisci con il tuo ID ruolo VIP

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vip-meme')
        .setDescription('Invia un meme o GIF esclusivo VIP 😂'),

    async execute(interaction) {
        // Controllo ruolo VIP
        if (!interaction.member.roles.cache.has(VIP_ROLE_ID)) {
            return interaction.reply({ content: '❌ Solo per VIP!', ephemeral: true });
        }

        await interaction.deferReply(); // Utile per dare tempo al fetch

        try {
            // Prende un meme random da subreddit safe e divertenti
            const response = await fetch('https://meme-api.com/gimme/50'); // 50 meme per più varietà
            const data = await response.json();

            // Filtra per assicurarsi che sia un'immagine/GIF e non NSFW (opzionale)
            const memes = data.memes.filter(m => !m.nsfw && (m.url.endsWith('.jpg') || m.url.endsWith('.png') || m.url.endsWith('.gif')));
            
            if (memes.length === 0) {
                return interaction.editReply({ content: '😅 Non ho trovato meme VIP al momento, riprova!' });
            }

            const randomMeme = memes[Math.floor(Math.random() * memes.length)];

            await interaction.editReply({
                content: `😂 **Meme esclusivo per te, VIP!**\n**${randomMeme.title}**\nDa r/${randomMeme.subreddit}`,
                files: [randomMeme.url]
            });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '😓 Errore nel caricamento del meme VIP, riprova più tardi!' });
        }
    }
};