const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Invia il pannello di verifica nel canale')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // === CONTROLLO PERMESSI ===
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
        interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ 
        content: 'Solo gli **amministratori** o il **proprietario del server** possono usare questo comando.', 
        ephemeral: true 
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // === CARICA CONFIG ===
    const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
    const verify = settings?.verify || {};

    // === VERIFICHE OBBLIGATORIE ===
    if (!verify.enabled) {
      return interaction.editReply({ 
        content: 'Il sistema di verifica è **disabilitato**.\nUsa `/verify-config enabled: true` per attivarlo.', 
        ephemeral: true 
      });
    }

    if (!verify.roleId) {
      return interaction.editReply({ 
        content: 'Nessun ruolo configurato.\nUsa `/verify-config role: @Ruolo`', 
        ephemeral: true 
      });
    }

    // === EMBED PERSONALIZZATO ===
    const embed = new EmbedBuilder()
      .setTitle(verify.title || 'Verifica il tuo account')
      .setDescription(verify.description || 'Clicca il pulsante per accedere al server.')
      .setColor(verify.color ? parseInt(verify.color.replace('#', ''), 16) : 0x00ff00)
      .setFooter({ text: verify.footer || 'Sistema di verifica automatico' })
      .setTimestamp();

    if (verify.image) embed.setImage(verify.image);

    // === BOTTONE SICURO + EMOJI VALIDA ===
    const buttonId = `verify_button_${interaction.guild.id}`;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(buttonId)
        .setLabel('Verifica')
        .setStyle(ButtonStyle.Success)
    );

    // === INVIO NEL CANALE ===
    try {
      await interaction.channel.send({
        embeds: [embed],
        components: [row]
      });

      await interaction.editReply({ 
        content: 'Pannello di verifica inviato con successo!', 
        ephemeral: true 
      });
    } catch (err) {
      console.error('Errore invio verify:', err);
      await interaction.editReply({ 
        content: 'Errore: non ho i permessi per inviare messaggi qui.', 
        ephemeral: true 
      });
    }
  }
};