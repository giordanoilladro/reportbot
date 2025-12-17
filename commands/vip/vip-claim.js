const { SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB(); // Funziona così
const VIP_ROLE_ID = '1413894001312006316'; // Sostituisci con il tuo

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vip-claim')
        .setDescription('Rivendica la tua ricompensa giornaliera VIP 🎁'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.member.roles.cache.has(VIP_ROLE_ID)) {
            return interaction.editReply({ content: '❌ Solo per VIP!' });
        }

        const userId = interaction.user.id;
        const lastClaim = await db.get(`vipclaim_${userId}`) || 0;
        const cooldown = 24 * 60 * 60 * 1000; // 24 ore

        if (Date.now() - lastClaim < cooldown) {
            const remaining = cooldown - (Date.now() - lastClaim);
            const hours = Math.floor(remaining / (60 * 60 * 1000));
            const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
            return interaction.editReply({ content: `⏰ Torna tra ${hours} ore e ${minutes} minuti per la prossima ricompensa VIP!` });
        }

        // Random tra 1 e 2000
        const reward = Math.floor(Math.random() * 2000) + 1;

        // Aggiorna balance (monete) e altri bonus (XP e ticket sono esempi, puoi integrarli con il tuo sistema)
        const currentCoins = await db.get(`coins_${userId}`) || 0;
        await db.set(`coins_${userId}`, currentCoins + reward);
        // Esempi bonus: +200 XP, +1 ticket (salvali in DB se vuoi)
        const currentXP = await db.get(`xp_${userId}`) || 0;
        await db.set(`xp_${userId}`, currentXP + 200);
        const currentTickets = await db.get(`tickets_${userId}`) || 0;
        await db.set(`tickets_${userId}`, currentTickets + 1);

        await db.set(`vipclaim_${userId}`, Date.now());

        await interaction.editReply({
            content: `🎁 **Ricompensa VIP giornaliera rivendicata!**\n\n` +
                     `+${reward} monete virtuali\n` +
                     `+200 XP extra\n` +
                     `+1 ticket lotteria VIP\n\n` +
                     `Il tuo nuovo balance: ${currentCoins + reward} monete 💎\n` +
                     `Grazie per il supporto!`
        });
    }
};