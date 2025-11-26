const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoClient = new MongoClient(process.env.MONGO_URI);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resoconti')
        .setDescription('Invia il resoconto giornaliero dei partner')
        .addIntegerOption(option =>
            option.setName('partners')
                .setDescription('Numero di partner segnalati')
                .setRequired(true)
                .setMinValue(0)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const partners = interaction.options.getInteger('partners');
        const staffName = interaction.user.username; // o interaction.user.tag se preferisci nome#1234
        const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

        try {
            await mongoClient.connect();
            const db = mongoClient.db();
            const guildConfig = await db.collection('resoconti_channels').findOne({
                guildId: interaction.guild.id
            });

            if (!guildConfig || !guildConfig.channelId) {
                return interaction.editReply({
                    content: 'Canale resoconti non configurato! Usa `/setup-resoconti #canale` prima.',
                    ephemeral: true
                });
            }

            const channel = interaction.guild.channels.cache.get(guildConfig.channelId);
            if (!channel) {
                return interaction.editReply({
                    content: 'Il canale configurato non esiste più. Riconfiguralo con `/setup-resoconti`.',
                    ephemeral: true
                });
            }

            const message = `:staff: **Staff** : ${staffName}\n:calendar_spiral: **Data** : ${today}\n:partner: **Partners** : ${partners}`;

            await channel.send(message);

            await interaction.editReply({
                content: `Resoconto inviato con successo in ${channel}! (${partners} partner)`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Errore resoconto:', error);
            await interaction.editReply({
                content: 'Errore durante l\'invio del resoconto. Contatta l\'admin.',
                ephemeral: true
            });
        } finally {
            await mongoClient.close();
        }
    },
};