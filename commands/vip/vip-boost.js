const { SlashCommandBuilder } = require('discord.js');

const VIP_ROLE_ID = '141389400131200631';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vip-boost')
        .setDescription('Attiva un boost temporaneo: emoji 💎 accanto al nick per 15 minuti'),

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(VIP_ROLE_ID)) {
            return interaction.reply({ content: '❌ Solo per VIP!', ephemeral: true });
        }

        const originalNick = interaction.member.displayName.replace(/^💎\s*/, '');
        const boostedNick = `💎 ${originalNick}`;

        try {
            await interaction.member.setNickname(boostedNick);
            await interaction.reply({ content: '✨ **Boost VIP attivato per 15 minuti!**', ephemeral: true });

            setTimeout(async () => {
                try {
                    await interaction.member.setNickname(originalNick);
                } catch {} // ignora errore
            }, 15 * 60 * 1000);
        } catch {
            await interaction.reply({ content: '❌ Non ho i permessi per cambiare il nickname!', ephemeral: true });
        }
    }
};