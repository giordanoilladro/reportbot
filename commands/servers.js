const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('servers')
    .setDescription('Comandi server')
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Mostra info del server')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('ID del server')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.options.getSubcommand() !== 'info') return;

    await interaction.deferReply();

    const serverId = interaction.options.getString('id');
    let guild;

    try {
      guild = await interaction.client.guilds.fetch(serverId).catch(() => null);

      if (!guild) {
        guild = await interaction.client.guilds.fetchPreview(serverId).catch(() => null);
      }

      if (!guild) {
        return interaction.editReply({ content: 'Server non trovato.' });
      }

      const embed = new EmbedBuilder()
        .setTitle(guild.name)
        .addFields(
          { name: 'ID', value: guild.id, inline: true },
          { name: 'Membri', value: guild.memberCount?.toString() || 'N/A', inline: true },
          { name: 'Boost', value: guild.premiumTier?.toString() || '0', inline: true }
        )
        .setThumbnail(guild.iconURL())
        .setColor('Blue');

      // Invito se il bot è nel server
      if (guild.members.me?.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
        const channel = guild.channels.cache.find(c => c.isTextBased());
        if (channel) {
          try {
            const invite = await channel.createInvite({ maxAge: 3600, maxUses: 1 });
            embed.addFields({ name: 'Invito', value: `[Clicca](${invite.url})` });
          } catch {}
        }
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: 'Errore.' });
    }
  },
};