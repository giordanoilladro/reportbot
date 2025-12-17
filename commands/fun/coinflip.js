// commands/fun/coinflip.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Scommetti coins contro un altro utente! 🪙')
        .addIntegerOption(option =>
            option
                .setName('money')
                .setDescription('Quanti coins vuoi scommettere? (min 10)')
                .setMinValue(10)
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName('utente')
                .setDescription('L\'utente contro cui scommettere')
                .setRequired(true)
        ),

    async execute(interaction) {
        const bet = interaction.options.getInteger('money');
        const opponent = interaction.options.getUser('utente');

        if (opponent.id === interaction.user.id) {
            return interaction.reply({ content: '❌ Non puoi scommettere contro te stesso!', ephemeral: true });
        }

        if (opponent.bot) {
            return interaction.reply({ content: '❌ Non puoi scommettere contro un bot!', ephemeral: true });
        }

        const userId = interaction.user.id;
        const opponentId = opponent.id;
        const guildId = interaction.guild.id;

        const userCoinsKey = `coins_${guildId}_${userId}`;
        const opponentCoinsKey = `coins_${guildId}_${opponentId}`;

        let userCoins = await db.get(userCoinsKey) || 0;
        let opponentCoins = await db.get(opponentCoinsKey) || 0;

        // Controllo saldo per entrambi
        if (userCoins < bet) {
            return interaction.reply({ content: `❌ Non hai abbastanza coins! Hai solo **${userCoins}** monete 🪙`, ephemeral: true });
        }
        if (opponentCoins < bet) {
            return interaction.reply({ content: `❌ ${opponent.username} non ha abbastanza coins! Ha solo **${opponentCoins}** monete 🪙`, ephemeral: true });
        }

        // GIF funzionanti
        const flippingGif = 'https://media.giphy.com/media/l2JehQ2VbanWOFqI8/giphy.gif';
        const headsGif = 'https://media.giphy.com/media/xT9IgzoKeLoR2mD86k/giphy.gif'; // Testa (executor vince)
        const tailsGif = 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif'; // Croce (opponent vince)

        const flippingEmbed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🪙 Lancio la moneta...')
            .setDescription(`**Scommessa:** ${bet} coins\n**Giocatori:** ${interaction.user.username} vs ${opponent.username}\nGira, gira... 🍃`)
            .setImage(flippingGif)
            .setFooter({ text: `Partita tra ${interaction.user.username} e ${opponent.username}` })
            .setTimestamp();

        await interaction.reply({ embeds: [flippingEmbed] });

        // Suspense
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 2000));

        const isHeads = Math.random() < 0.5; // 50% chance: heads = executor vince

        let resultEmbed;
        if (isHeads) {
            // Executor vince: prende il doppio (+bet netto)
            userCoins += bet;
            opponentCoins -= bet;

            await db.set(userCoinsKey, userCoins);
            await db.set(opponentCoinsKey, opponentCoins);

            resultEmbed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('🪙 TESTA! HAI VINTO! 🎉')
                .setDescription(
                    `**Vincitore:** ${interaction.user.username} (+${bet} coins, totale ${userCoins})\n` +
                    `**Sconfitto:** ${opponent.username} (-${bet} coins, totale ${opponentCoins})\n` +
                    `Guadagno netto: il doppio della scommessa!`
                )
                .setImage(headsGif)
                .setTimestamp();
        } else {
            // Opponent vince: executor perde
            userCoins -= bet;
            opponentCoins += bet;

            await db.set(userCoinsKey, userCoins);
            await db.set(opponentCoinsKey, opponentCoins);

            resultEmbed = new EmbedBuilder()
                .setColor(0xFF6B6B)
                .setTitle('🪙 CROCE... HAI PERSO 😢')
                .setDescription(
                    `**Vincitore:** ${opponent.username} (+${bet} coins, totale ${opponentCoins})\n` +
                    `**Sconfitto:** ${interaction.user.username} (-${bet} coins, totale ${userCoins})\n` +
                    `Hai perso solo la scommessa.`
                )
                .setImage(tailsGif)
                .setTimestamp();
        }

        resultEmbed.setFooter({ text: `Partita tra ${interaction.user.username} e ${opponent.username}` });

        await interaction.editReply({ embeds: [resultEmbed] });
    }
};