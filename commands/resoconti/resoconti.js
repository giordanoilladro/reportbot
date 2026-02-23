const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const RUOLO_AUTORIZZATO = '1475259182235127909';
const CANALE_ID = '1475259760193572904';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resoconti')
        .setDescription('Invia un resoconto partners per il server selezionato.')
        .addStringOption(option =>
            option
                .setName('server')
                .setDescription('Scegli il server partner')
                .setRequired(true)
                .addChoices(
                    { name: 'HamsterHouse', value: 'HamsterHouse' },
                    { name: 'Piacenza Roleplay', value: 'Piacenza Roleplay' }
                )
        )
        .addStringOption(option =>
            option
                .setName('staff')
                .setDescription('Nome dello staff che invia il resoconto')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('partners')
                .setDescription('Numero di partners')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('data')
                .setDescription('Data del resoconto (default: oggi, formato YYYY-MM-DD)')
                .setRequired(false)
        ),

    async execute(interaction) {
        // Controllo ruolo autorizzato
        const hasRole = interaction.member.roles.cache.has(RUOLO_AUTORIZZATO);
        if (!hasRole) {
            return await interaction.reply({
                content: '❌ Non hai il permesso di usare questo comando.',
                ephemeral: true
            });
        }

        const server   = interaction.options.getString('server');
        const staff    = interaction.options.getString('staff');
        const partners = interaction.options.getInteger('partners');

        // Data di default = oggi
        const dataInput = interaction.options.getString('data');
        const data = dataInput ?? new Date().toISOString().split('T')[0];

        // Costruzione del messaggio
        const messaggio =
            `<:Staff:1443248739073396806> **Staff** : ${staff}\n` +
            `:calendar_spiral: **Data** : ${data}\n` +
            `<:partner:1443248870057574660> **Partners** : ${partners}\n` +
            `🖥️ **Server** : ${server}`;

        // Recupero del canale target
        const canale = await interaction.client.channels.fetch(CANALE_ID);

        if (!canale) {
            return await interaction.reply({
                content: '❌ Canale non trovato.',
                ephemeral: true
            });
        }

        // Invio nel canale dedicato
        await canale.send(messaggio);

        // Conferma ephemeral all'utente
        await interaction.reply({
            content: `✅ Resoconto inviato con successo in <#${CANALE_ID}>!`,
            ephemeral: true
        });
    }
};