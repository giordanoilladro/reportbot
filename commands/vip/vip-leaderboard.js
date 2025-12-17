const { SlashCommandBuilder } = require('discord.js');
const QuickDB = require('quick.db');
const db = new QuickDB();
const VIP_ROLE_ID = '1413894001312006316'; // Sostituisci con il tuo

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vip-leaderboard')
        .setDescription('Mostra la leaderboard VIP per monete 🏆'),

    async execute(interaction) {
        await interaction.deferReply();

        // Prendi tutti gli utenti VIP dal guild (filtra per ruolo)
        const guild = interaction.guild;
        const vipMembers = guild.members.cache.filter(member => member.roles.cache.has(VIP_ROLE_ID));

        // Raccogli balances solo per VIP
        const leaderboard = [];
        for (const member of vipMembers.values()) {
            const coins = await db.get(`coins_${member.id}`) || 0;
            leaderboard.push({ user: member.user.tag, coins });
        }

        // Ordina per coins decrescente e prendi top 10
        leaderboard.sort((a, b) => b.coins - a.coins);
        const top10 = leaderboard.slice(0, 10);

        let message = '🏆 **Leaderboard VIP Monete**\n\n';
        top10.forEach((entry, index) => {
            message += `${index + 1}. ${entry.user} - ${entry.coins} monete\n`;
        });

        if (top10.length === 0) {
            message = '😅 Nessun VIP con monete al momento!';
        }

        await interaction.editReply({ content: message });
    }
};