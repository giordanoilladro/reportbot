const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoClient = new MongoClient(process.env.MONGO_URI);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-resoconti')
        .setDescription('Imposta il canale dove inviare i resoconti')
        .addChannelOption(option =>
            option.setName('canale')
                .setDescription('Canale per i resoconti')
                .setRequired(true)
                .addChannelTypes(0) // 0 = Text Channel
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel('canale');

        try {
            await mongoClient.connect();
            const db = mongoClient.db();

            await db.collection('resoconti_channels').updateOne(
                { guildId: interaction.guild.id },
                { $set: { guildId: interaction.guild.id, channelId: channel.id } },
                { upsert: true }
            );

            await interaction.reply({
                content: `Canale resoconti impostato correttamente: ${channel}`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Errore setup resoconti:', error);
            await interaction.reply({
                content: 'Errore durante il salvataggio del canale.',
                ephemeral: true
            });
        } finally {
            await mongoClient.close();
        }
    },
};