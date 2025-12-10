const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const CONFIG_FILE = './data/config.json';
const RECENSIONI_FILE = './data/recensioni.json';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recensione-staff')
    .setDescription('Lascia una recensione a uno staff')
    .addUserOption(o => o.setName('staff').setDescription('Staff').setRequired(true))
    .addIntegerOption(o => o
      .setName('stelle')
      .setDescription('Stelle')
      .setRequired(true)
      .addChoices({name:'1 star',value:1},{name:'2 stars',value:2},{name:'3 stars',value:3},{name:'4 stars',value:4},{name:'5 stars',value:5}))
    .addStringOption(o => o
      .setName('tipo')
      .setDescription('Tipo assistenza')
      .setRequired(true)
      .addChoices(
        {name:'Ticket',value:'Ticket'},
        {name:'Moderazione',value:'Moderazione'},
        {name:'Evento',value:'Evento'},
        {name:'Aiuto tecnico',value:'Aiuto tecnico'},
        {name:'Altro',value:'Altro'}
      ))
    .addStringOption(o => o.setName('positivo').setDescription('Cosa ti è piaciuto?').setRequired(false))
    .addStringOption(o => o.setName('migliorare').setDescription('Cosa migliorare?').setRequired(false)),

  async execute(interaction) {
    const staff = interaction.options.getUser('staff');
    const stelle = interaction.options.getInteger('stelle');
    const tipo = interaction.options.getString('tipo');
    const positivo = interaction.options.getString('positivo') ?? 'Nessun commento';
    const migliorare = interaction.options.getString('migliorare') ?? 'Nessun suggerimento';
    const stelleVisive = '★'.repeat(stelle) + '☆'.repeat(5 - stelle);

    // --- LEGGE CONFIG ---
    if (!fs.existsSync(CONFIG_FILE)) {
      return interaction.reply({ content: 'Nessun canale impostato! Usa prima `/imposta-canale-recensioni`', ephemeral: true });
    }
    const configRaw = fs.readFileSync(CONFIG_FILE, 'utf-8').trim();
    if (!configRaw) return interaction.reply({ content: 'Configurazione vuota! Usa prima `/imposta-canale-recensioni`', ephemeral: true });
    const config = JSON.parse(configRaw);
    const canaleId = config[interaction.guild.id];
    if (!canaleId) return interaction.reply({ content: 'Nessun canale impostato in questo server!', ephemeral: true });

    const canale = interaction.guild.channels.cache.get(canaleId);
    if (!canale) return interaction.reply({ content: 'Il canale non esiste più!', ephemeral: true });

    // --- INVIA EMBED ---
    const embed = new EmbedBuilder()
      .setColor(stelle >= 4 ? 0x00ff00 : stelle >= 3 ? 0xffff00 : 0xff0000)
      .setTitle('Nuova Recensione Staff')
      .setThumbnail(staff.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Staff', value: `${staff}`, inline: true },
        { name: 'Valutazione', value: `${stelleVisive} (${stelle}/5)`, inline: true },
        { name: 'Tipo', value: tipo, inline: true },
        { name: 'Positivo', value: positivo, inline: false },
        { name: 'Da migliorare', value: migliorare, inline: false }
      )
      .setFooter({ text: `Da ${interaction.user.tag}` })
      .setTimestamp();

    await canale.send({ embeds: [embed] });

    // --- SALVA RECENSIONE (anti-crash) ---
    let recensioni = [];
    if (fs.existsSync(RECENSIONI_FILE)) {
      const raw = fs.readFileSync(RECENSIONI_FILE, 'utf-8').trim();
      if (raw) {
        try { recensioni = JSON.parse(raw); } catch(e) { recensioni = []; }
      }
    }

    recensioni.push({
      guildId: interaction.guild.id,
      staffId: staff.id,
      autoreId: interaction.user.id,
      stelle,
      tipo,
      positivo,
      migliorare,
      data: new Date().toISOString()
    });

    fs.writeFileSync(RECENSIONI_FILE, JSON.stringify(recensioni, null, 2));

    await interaction.reply({ content: `Recensione inviata! ${stelleVisive}`, ephemeral: true });
  },
};