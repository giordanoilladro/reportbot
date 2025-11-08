const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra tutti i comandi disponibili'),

  async execute(interaction) {
    const commands = interaction.client.commands;
    const totalCommands = commands.size;
    const commandsPerPage = 6;
    const totalPages = Math.ceil(totalCommands / commandsPerPage);

    let page = 1;

    const generateEmbed = (page) => {
      const start = (page - 1) * commandsPerPage;
      const end = start + commandsPerPage;
      const pageCommands = Array.from(commands.values()).slice(start, end);

      const embed = new EmbedBuilder()
        .setColor('#00ff88')
        .setTitle('COMANDI DEL BOT')
        .setDescription('Ecco tutti i comandi disponibili!')
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setFooter({ 
          text: `Pagina ${page}/${totalPages} • ${totalCommands} comandi totali`, 
          iconURL: interaction.guild.iconURL() 
        })
        .setTimestamp();

      pageCommands.forEach(cmd => {
        const usage = cmd.data.options?.length > 0 
          ? cmd.data.options.map(opt => 
              opt.required ? `<${opt.name}>` : `[${opt.name}]`
            ).join(' ') 
          : 'Nessun parametro';
        
        embed.addFields({
          name: `/${cmd.data.name}`,
          value: `${cmd.data.description}\n**Uso:** \`/${cmd.data.name} ${usage}\``,
          inline: false
        });
      });

      return embed;
    };

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('Indietro')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Avanti')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages)
      );

    const message = await interaction.reply({
      embeds: [generateEmbed(page)],
      components: totalPages > 1 ? [row] : [],
      fetchReply: true
    });

    if (totalPages <= 1) return;

    const collector = message.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 60000
    });

    collector.on('collect', async i => {
      if (i.customId === 'prev') page = page > 1 ? page - 1 : 1;
      if (i.customId === 'next') page = page < totalPages ? page + 1 : totalPages;

      row.components[0].setDisabled(page === 1);
      row.components[1].setDisabled(page === totalPages);

      await i.update({
        embeds: [generateEmbed(page)],
        components: [row]
      });
    });

    collector.on('end', () => {
      message.edit({ components: [] }).catch(() => {});
    });
  }
};