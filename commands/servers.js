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
          option
            .setName('id')
            .setDescription('ID del server')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.options.getSubcommand() !== 'info') return;

    await interaction.deferReply({ ephemeral: false });

    const serverId = interaction.options.getString('id');

    try {
      // 1. Prova prima a prendere la guild completa (se il bot è dentro)
      let guild = await interaction.client.guilds.fetch(serverId).catch(() => null);

      let isInGuild = !!guild;
      let preview = null;

      // 2. Se il bot NON è nel server, usa fetchPreview() sul singolo oggetto Guild
      if (!guild) {
        // Prima fetch della guild "base" (senza cache completa)
        const bareGuild = await interaction.client.guilds.fetch(serverId).catch(() => null);
        if (bareGuild) {
          try {
            preview = await bareGuild.fetchPreview();
            guild = preview; // usiamo la preview come oggetto "guild-like"
          } catch (e) {
            // Non sempre fetchPreview funziona (es. server privati, bot non abilitato, ecc.)
            return interaction.editReply({ content: 'Server non trovato o preview non disponibile.' });
          }
        } else {
          return interaction.editReply({ content: 'Server non trovato.' });
        }
      }

      // Ora guild può essere:
      // - una Guild completa (se il bot è dentro)
      // - un GuildPreview (se il bot non è dentro ma la preview è pubblica)

      const embed = new EmbedBuilder()
        .setTitle(guild.name || guild.guild.name) // GuildPreview usa .guild.name
        .setThumbnail(guild.iconURL?.({ dynamic: true }) || null)
        .setColor('#0099ff')
        .addFields(
          { name: 'ID', value: guild.id, inline: true },
          {
            name: 'Membri',
            value: (guild.memberCount ?? guild.approximateMemberCount ?? 'N/A').toString(),
            inline: true,
          },
          {
            name: 'Boost',
            value: guild.premiumTier?.toString() ?? guild.premiumSubscriptionCount?.toString() ?? '0',
            inline: true,
          }
        );

      // Solo se il bot è realmente nel server possiamo creare un invito
      if (isInGuild && guild.members.me?.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
        const channel = guild.channels.cache.find(ch => 
          ch.isTextBased() && ch.permissionsFor(guild.members.me).has(PermissionFlagsBits.CreateInstantInvite)
        );

        if (channel) {
          try {
            const invite = await channel.createInvite({ maxAge: 3600, maxUses: 1, unique: true });
            embed.addFields({ 
              name: 'Invito temporaneo', 
              value: `[Clicca qui](${invite.url}) (scade in 1 ora)` 
            });
          } catch (err) {
            // Ignora silenziosamente se non può creare invito
          }
        }
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('Errore comando /servers info:', err);
      await interaction.editReply({ content: 'Si è verificato un errore imprevisto.' }).catch(() => {});
    }
  },
};