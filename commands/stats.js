const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Mostra le statistiche del bot in modo bello e semplice'),

    async execute(interaction) {
        // Uptime in formato umano
        const uptime = process.uptime();
        const giorni = Math.floor(uptime / 86400);
        const ore = Math.floor((uptime % 86400) / 3600);
        const minuti = Math.floor((uptime % 3600) / 60);
        const secondi = Math.floor(uptime % 60);

        const uptimeStr = 
            (giorni > 0 ? `${giorni} giorni ` : '') +
            (ore > 0 ? `${ore} ore ` : '') +
            (minuti > 0 ? `${minuti} minuti ` : '') +
            `${secondi} secondi`;

        // Server e utenti
        const guildCount = interaction.client.guilds.cache.size;
        const userCount = interaction.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

        // Ping
        const ping = interaction.client.ws.ping;

        // Memoria arrotondata
        const memoria = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

        // Embed bella
        const embed = new EmbedBuilder()
            .setColor('#00ff99') // Verde brillante
            .setTitle('Bot Stats')
            .setDescription('Ecco come sto andando oggi!')
            .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
            .addFields(
                { 
                    name: 'Tempo Online', 
                    value: `**${uptimeStr.trim()}**`, 
                    inline: true 
                },
                { 
                    name: 'Server Attivi', 
                    value: `**${guildCount}** server`, 
                    inline: true 
                },
                { 
                    name: 'Utenti Totali', 
                    value: `**${userCount.toLocaleString()}** utenti`, 
                    inline: true 
                },
                { 
                    name: 'Latenza', 
                    value: ping < 0 ? 'Calcolando...' : `**${ping}ms**`, 
                    inline: true 
                },
                { 
                    name: 'Memoria Usata', 
                    value: `**${memoria} MB**`, 
                    inline: true 
                }
            )
            .setFooter({ 
                text: `Richiesto da ${interaction.user.tag}`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();

        // Rispondi con stile
        await interaction.reply({ 
            embeds: [embed], 
            ephemeral: false 
        });
    }
};