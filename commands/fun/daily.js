const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Mostra il daily (coming soon)'),

    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setTitle('🔔 /daily')
            .setDescription('Prossimamente in arrivo.. ✨🚀\n\nRimani sintonizzato — tante novità in programma! 🎉')
            .setColor(0xFF8A65) // colore arancio
            .setFooter({ text: 'Daily • A presto! 🫶' })
            // puoi rimuovere la thumbnail se non ti serve

        await interaction.reply({ embeds: [embed], ephemeral: false });
    }
};
