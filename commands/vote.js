const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('🗳️ Mostra i link per votare il bot'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#ffcc00')
            .setTitle('🗳️ Vota il bot!')
            .setDescription('Puoi supportare il bot votandolo sui seguenti siti:')
            .addFields(
                { name: '🔗 Vota Bot!', value: '[Vota qui](https://top.gg/bot/1372558922266836992?s=0ec4d0ae34c37)', inline: false },
                { name: '🔗 Vota Server!', value: '[Vota qui](https://discordbotlist.com/servers/hamsters-house/upvote)', inline: false }
            )
            .setFooter({ text: 'Grazie per il tuo supporto ❤️' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: false });
    }
};
