const { SlashCommandBuilder } = require('discord.js');
const QuickDB = require('quick.db');
const db = new QuickDB();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Trasferisci monete a un altro utente 💸')
        .addUserOption(option => option.setName('utente').setDescription('L\'utente a cui inviare').setRequired(true))
        .addIntegerOption(option => option.setName('importo').setDescription('Quante monete').setRequired(true).setMinValue(1)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const senderId = interaction.user.id;
        const receiver = interaction.options.getUser('utente');
        const amount = interaction.options.getInteger('importo');

        if (receiver.id === senderId) {
            return interaction.editReply({ content: '❌ Non puoi inviare monete a te stesso!' });
        }

        const senderCoins = await db.get(`coins_${senderId}`) || 0;
        if (senderCoins < amount) {
            return interaction.editReply({ content: `❌ Non hai abbastanza monete! Il tuo balance: ${senderCoins}` });
        }

        // Trasferisci
        const receiverCoins = await db.get(`coins_${receiver.id}`) || 0;
        await db.set(`coins_${senderId}`, senderCoins - amount);
        await db.set(`coins_${receiver.id}`, receiverCoins + amount);

        await interaction.editReply({ content: `💸 Hai inviato ${amount} monete a ${receiver.username}!\nIl tuo nuovo balance: ${senderCoins - amount}` });

        // Notifica il ricevente (opzionale, ma carino)
        try {
            await receiver.send(`🔔 Hai ricevuto ${amount} monete da ${interaction.user.username}!`);
        } catch (error) {
            // Ignora se non può inviare DM
        }
    }
};