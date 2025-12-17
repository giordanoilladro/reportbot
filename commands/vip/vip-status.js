const { SlashCommandBuilder } = require('discord.js');

const VIP_ROLE_ID = '1413894001312006316'; // SOSTITUISCI

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vip-status')
        .setDescription('Mostra il tuo status VIP con durata e benefici 💎'),

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(VIP_ROLE_ID)) {
            return interaction.reply({ content: '❌ Questo comando è riservato ai VIP!', ephemeral: true });
        }

        // Esempio: puoi collegare un database per la data di scadenza
        const scadenza = '31 Dicembre 2026'; // oppure calcola da DB

        const embed = {
            title: '💎 Il tuo Status VIP 💎',
            description: `**Sei un VIP leggendario!**\n\n` +
                         `**Scadenza:** ${scadenza}\n` +
                         `**Benefici esclusivi:**\n` +
                         `• Comandi premium\n` +
                         `• Giveaway esclusivi\n` +
                         `• Colore ruolo personalizzato\n` +
                         `• Ricompense giornaliere extra\n` +
                         `• Contenuti segreti`,
            color: 0xFFD700,
            thumbnail: { url: interaction.user.displayAvatarURL() },
            footer: { text: 'Grazie per il supporto! ❤️' }
        };

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};