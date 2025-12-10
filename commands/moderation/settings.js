// commands/admin/settings.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('⚙️ Mostra TUTTE le impostazioni reali del bot in questo server (auto-scansionate)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const client = interaction.client;

    // === 1. RACCOGLIE TUTTE LE IMPOSTAZIONI POSSIBILI DAL BOT ===
    let rawSettings = {};

    // Prova tutti i sistemi comuni di storage (aggiungine altri se usi qualcosa di diverso)
    if (client.settings?.get) rawSettings = { ...rawSettings, ...(client.settings.get(guild.id) || {}) };
    if (client.db?.get) rawSettings = { ...rawSettings, ...(await client.db.get(`guild_${guild.id}`) || {}) };
    if (client.guildData?.get) rawSettings = { ...rawSettings, ...(client.guildData.get(guild.id) || {}) };
    if (client.config?.guilds?.[guild.id]) rawSettings = { ...rawSettings, ...client.config.guilds[guild.id] };
    if (client.database?.guilds?.findOne) {
      const dbData = await client.database.guilds.findOne({ id: guild.id });
      if (dbData) rawSettings = { ...rawSettings, ...dbData };
    }
    // Aggiungi QUI altri client.tuoDB.get(guild.id) se ne usi

    // Fallback: se non c'è niente
    if (Object.keys(rawSettings).length === 0) {
      return await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xff6b6b)
          .setTitle('⚙️ Nessuna impostazione trovata')
          .setDescription('Il bot non ha ancora salvato nessuna configurazione per questo server.\nUsa i comandi di setup per iniziare!')
        ]
      });
    }

    // === 2. FUNZIONI PER FORMATTARE I VALORI IN MODO BELLO ===
    const formatValue = (value) => {
      if (value === true) return '✅ Attivo';
      if (value === false) return '❌ Disattivato';
      if (typeof value === 'string') {
        if (value.match(/^\d{17,19}$/)) {
          if (value.length === 18 && client.channels.cache.has(value)) return `<#${value}>`;
          if (client.roles.cache.has(value)) return `<@&${value}>`;
          if (client.users.cache.has(value)) return `<@${value}>`;
        }
        return value.length > 50 ? value.substring(0, 47) + '...' : value;
      }
      if (Array.isArray(value)) return value.length > 0 ? value.slice(0, 3).join(', ') + (value.length > 3 ? '...' : '') : 'Vuoto';
      if (typeof value === 'object' && value !== null) return 'Oggetto complesso';
      return String(value);
    };

    // === 3. COSTRUISCE L'EMBED DINAMICAMENTE ===
    const embed = new EmbedBuilder()
      .setColor(0x00ffb3)
      .setTitle(`⚙️ Impostazioni del bot — ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256, dynamic: true }))
      .setDescription(`Trovate **${Object.keys(rawSettings).length}** impostazioni salvate nel bot per questo server.`)
      .setTimestamp()
      .setFooter({ text: `Richiesto da ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    // Divide in campi da max 25 (limite Discord)
    const entries = Object.entries(rawSettings).sort((a, b) => a[0].localeCompare(b[0]));
    let fieldCount = 0;
    let currentField = { name: 'Impostazioni', value: '', inline: false };

    for (const [key, value] of entries) {
      const line = `**${key}** → ${formatValue(value)}\n`;
      if (currentField.value.length + line.length > 1024) {
        embed.addFields(currentField);
        currentField = { name: 'Continua...', value: line, inline: false };
        fieldCount++;
      } else {
        currentField.value += line;
      }
    }
    if (currentField.value) embed.addFields(currentField);

    // Aggiungi info base server
    embed.addFields({
      name: 'ℹ️ Info Server',
      value: `👑 Owner: <@${guild.ownerId}>\n👥 Membri: ${guild.memberCount}\n🆔 ID: \`${guild.id}\``,
      inline: false
    });

    await interaction.editReply({ embeds: [embed] });
  },
};