const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Lancia una moneta e scommetti coins! 🪙')
        .addIntegerOption(option =>
            option
                .setName('scommessa')
                .setDescription('Quanti coins vuoi scommettere? (opzionale, min 10)')
                .setMinValue(10)
                .setRequired(false)
        ),

    async execute(interaction) {
        const bet = interaction.options.getInteger('scommessa') || 0;
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const coinsKey = `coins_${guildId}_${userId}`;

        let currentCoins = await db.get(coinsKey) || 0;

        // GIF nuove e funzionanti
        const flippingGif = 'https://media.giphy.com/media/f4OfUKE2eVpoFi6dxI/giphy.gif'; // Moneta che gira in aria (realistica)
        const headsGif = 'https://media.giphy.com/media/3o6fIVWkDCb89PauSQ/giphy.gif'; // Atterra su Heads/Tails con reveal (buona per heads)
        const tailsGif = 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif'; // Flipping classico da Tenor (funziona bene per tails o generico)

        if (bet > 0) {
            if (currentCoins < bet) {
                return interaction.reply({ content: `❌ Non hai abbastanza coins! Ne hai solo **${currentCoins}** 🪙`, ephemeral: true });
            }
        }

        const flippingEmbed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🪙 Lancio la moneta...')
            .setDescription(bet > 0 ? `*Scommessa: ${bet} coins!*\nGira, gira... il destino decide! 🍃` : '*Gira, gira, gira...* 🍃')
            .setImage(flippingGif)
            .setFooter({ text: `Richiesto da ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [flippingEmbed] });

        const delay = Math.floor(Math.random() * 2000) + 2000;
        await new Promise(resolve => setTimeout(resolve, delay));

        const isHeads = Math.random() < 0.5;
        const risultatoTesto = isHeads ? '**TESTA!** 🪙' : '**CROCE!** 🪙';
        const risultatoGif = isHeads ? headsGif : tailsGif;

        let descrizione = `**Risultato:** ${risultatoTesto}\n\n`;
        let colore = 0x7289DA;

        if (bet > 0) {
            if (isHeads) {
                const vincita = bet * 2;
                currentCoins += bet;
                await db.set(coinsKey, currentCoins);
                descrizione += `🎉 **Hai vinto!** +${bet} coins (totale ${vincita})\nOra hai **${currentCoins}** coins 🪙`;
                colore = 0x00AE86;
            } else {
                currentCoins -= bet;
                await db.set(coinsKey, currentCoins);
                descrizione += `😢 **Hai perso!** -${bet} coins\nOra hai **${currentCoins}** coins 🪙`;
                colore = 0xFF6B6B;
            }
        } else {
            descrizione += isHeads ? 'La fortuna ti sorride! 😄' : 'Ritenta, sarà più fortunato! 🍀';
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(colore)
            .setTitle('🪙 La moneta è atterrata!')
            .setDescription(descrizione)
            .setImage(risultatoGif)
            .setFooter({ text: `Lanciato da ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.editReply({ embeds: [resultEmbed] });
    }
};