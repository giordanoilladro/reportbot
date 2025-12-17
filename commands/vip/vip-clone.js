// commands/vip/vip-clone.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const VIP_ROLE_ID = '1413894001312006316';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vip-clone')
    .setDescription('Clona te stesso: invia un messaggio con il tuo avatar in un canale 🔮')
    .addChannelOption(option =>
      option.setName('canale')
        .setDescription('Canale dove inviare il messaggio clonato')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('messaggio')
        .setDescription('Il messaggio da inviare come clone')
        .setRequired(true)
        .setMaxLength(2000)
    )
    .addBooleanOption(option =>
      option.setName('anonimo')
        .setDescription('Nascondi il tuo nome? (default: no)')
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(VIP_ROLE_ID)) {
      return interaction.reply({ content: '❌ Solo i VIP possono clonarsi!', flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.options.getChannel('canale');
    const message = interaction.options.getString('messaggio');
    const anonymous = interaction.options.getBoolean('anonimo') || false;

    if (!channel.isTextBased()) {
      return interaction.reply({ content: '❌ Devi scegliere un canale testuale!', flags: MessageFlags.Ephemeral });
    }

    try {
      const webhook = await channel.createWebhook({
        name: anonymous ? 'Misterioso VIP' : interaction.user.username,
        avatar: interaction.user.displayAvatarURL({ size: 256 }),
        reason: 'VIP Clone command'
      });

      await webhook.send({
        content: message,
        username: anonymous ? 'Un VIP misterioso' : interaction.user.username,
        avatarURL: interaction.user.displayAvatarURL({ size: 256 })
      });

      // Elimina webhook subito dopo (pulizia)
      await webhook.delete('Comando completato');

      const embed = new EmbedBuilder()
        .setColor(0x9400D3)
        .setTitle('🔮 CLONE ATTIVATO')
        .setDescription(
          `Il tuo messaggio è stato inviato in ${channel} come clone!\n` +
          `${anonymous ? 'In modalità anonima 😶' : 'Con il tuo nome visibile 👤'}\n` +
          `Nessuna traccia lasciata...`
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } catch (error) {
      await interaction.reply({ content: '❌ Errore: Non ho permessi per creare webhook in quel canale!', flags: MessageFlags.Ephemeral });
    }
  }
};