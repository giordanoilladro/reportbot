const { SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB(); // Funziona così

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Rivendica la tua ricompensa giornaliera 🎁'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const lastClaim = await db.get(`daily_${userId}`) || 0;
        const cooldown = 24 * 60 * 60 * 1000; // 24 ore

        if (Date.now() - lastClaim < cooldown) {
            const remaining = cooldown - (Date.now() - lastClaim);
            const hours = Math.floor(remaining / (60 * 60 * 1000));
            const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
            return interaction.editReply({ content: `⏰ Torna tra ${hours} ore e ${minutes} minuti per la prossima ricompensa!` });
        }

        // Random tra 1 e 500
        const reward = Math.floor(Math.random() * 500) + 1;

        // Aggiorna balance
        const currentCoins = await db.get(`coins_${userId}`) || 0;
        await db.set(`coins_${userId}`, currentCoins + reward);
        await db.set(`daily_${userId}`, Date.now());

        await interaction.editReply({
            content: `🎁 **Ricompensa giornaliera rivendicata!**\n\n` +
                     `+${reward} monete virtuali\n\n` +
                     `Il tuo nuovo balance: ${currentCoins + reward} monete 💰`
        });
    }
};