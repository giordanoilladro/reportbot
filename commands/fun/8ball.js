const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Chiedi consiglio alla magica sfera 8-Ball 🎱')
        .addStringOption(option =>
            option
                .setName('domanda')
                .setDescription('La tua domanda (meglio se finisce con ?)')
                .setRequired(true)
                .setMaxLength(200)
        ),

    async execute(interaction) {
        const domanda = interaction.options.getString('domanda').trim();

        if (!domanda.endsWith('?') && !domanda.endsWith('?!') && !domanda.endsWith('??')) {
            return interaction.reply({
                content: '🤔 Sembra più un\'affermazione... Prova con una vera domanda che finisce con **?**! 🎱',
                ephemeral: true
            });
        }

        // GIF shaking principale (realistica e animata forte!)
        const shakingGif = 'https://media.giphy.com/media/efahzan109oWdMRKnH/giphy.gif';

        // GIF reveal specifiche (tutte funzionanti e animate)
        const revealGifs = {
            positive: 'https://media.giphy.com/media/3o7bubjk9UPTmtMX9m/giphy.gif', // Shaking che porta a reveal positivo
            neutral: 'https://media.giphy.com/media/3oge86TxFDmhkprqh2/giphy.gif', // Misty reveal (perfetto per neutre)
            negative: 'https://media.giphy.com/media/l4j2sh8qNuPYzM8e22/giphy.gif', // Chiaro "No"
            funny: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHE5dXl3NDk3aWhxbGIzbmQwamc4amM5enlydHpucHRzN2Jnd3AyZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l2JdZX62ORag2NZXG/giphy.gif' // Bart Simpson shaking (super divertente)
        };

        const risposte = [
            { text: 'Sì, assolutamente! ✨', type: 'positive' },
            { text: 'Senza alcun dubbio 💯', type: 'positive' },
            { text: 'Le mie fonti dicono di sì 👍', type: 'positive' },
            { text: 'Prospettive molto buone 🌟', type: 'positive' },
            { text: 'Decisamente sì! 🎉', type: 'positive' },
            { text: 'Chiedi di nuovo più tardi 🔮', type: 'neutral' },
            { text: 'Non posso predirlo ora 🌫️', type: 'neutral' },
            { text: 'Concentrati e chiedi ancora 🧘', type: 'neutral' },
            { text: 'Meglio non dirtelo ora 🤫', type: 'neutral' },
            { text: 'È deciso così, ma non ti dico come 😏', type: 'neutral' },
            { text: 'Non contarci troppo ❌', type: 'negative' },
            { text: 'Le mie fonti dicono no 👎', type: 'negative' },
            { text: 'Molto improbabile ☹️', type: 'negative' },
            { text: 'Prospettive non buone 😬', type: 'negative' },
            { text: 'No, decisamente no 🚫', type: 'negative' },
            { text: 'Sì, ma solo se offri da bere 🍻', type: 'funny' },
            { text: 'Solo se smetti di fare domande stupide 😜', type: 'funny' },
            { text: 'La sfera si è addormentata... russ russ 💤', type: 'funny' },
            { text: '42. (La risposta a tutto) 🤯', type: 'funny' },
            { text: 'Chiedi a tua madre 👀', type: 'funny' }
        ];

        const rispostaScelta = risposte[Math.floor(Math.random() * risposte.length)];

        const colors = {
            positive: 0x00FF00,
            neutral: 0xFFFF00,
            negative: 0xFF0000,
            funny: 0xFF69B4
        };

        // GIF reveal basata sul tipo (fallback su shaking)
        const revealGif = revealGifs[rispostaScelta.type] || shakingGif;

        // Embed iniziale: shaking
        const thinkingEmbed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('🎱 Sto scuotendo forte la Magic 8-Ball...')
            .setDescription('*Il liquido si agita... il destino sta decidendo...* 🔮')
            .setImage(shakingGif)
            .setFooter({ text: `Domanda di ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [thinkingEmbed] });

        // Delay suspense
        const delay = Math.floor(Math.random() * 3000) + 2000;
        await new Promise(resolve => setTimeout(resolve, delay));

        // Embed finale
        const finalEmbed = new EmbedBuilder()
            .setColor(colors[rispostaScelta.type] || 0x9400D3)
            .setTitle('🎱 La Magic 8-Ball ha rivelato la verità!')
            .setImage(revealGif)
            .addFields(
                { name: '💭 La tua domanda', value: `\`\`\`${domanda}\`\`\``, inline: false },
                { name: '🔮 La risposta', value: `**${rispostaScelta.text}**`, inline: false }
            )
            .setFooter({ text: `Richiesto da ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.editReply({ embeds: [finalEmbed] });
    }
};