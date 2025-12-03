const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilink')
    .setDescription('Configura l\'antilink (solo link Discord permessi di default)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option => option.setName('enable').setDescription('on/off').setRequired(true).addChoices({name:'Attiva',value:'on'},{name:'Disattiva',value:'off'}))
    .addRoleOption(option => option.setName('whitelist_role').setDescription('Ruolo da ignorare'))
    .addUserOption(option => option.setName('whitelist_user').setDescription('Utente da ignorare'))
    .addChannelOption(option => option.setName('whitelist_channel').setDescription('Canale da ignorare'))
    .addBooleanOption(option => option.setName('clear_whitelist').setDescription('Rimuovi tutta la whitelist')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || new Guild({ guildId: interaction.guild.id });

    const enable = interaction.options.getString('enable');
    guildData.antilink.enabled = enable === 'on';

    if (interaction.options.getBoolean('clear_whitelist')) {
      guildData.antilink.whitelistRoles = [];
      guildData.antilink.whitelistUsers = [];
      guildData.antilink.whitelistChannels = [];
    }

    const role = interaction.options.getRole('whitelist_role');
    const user = interaction.options.getUser('whitelist_user');
    const channel = interaction.options.getChannel('whitelist_channel');

    if (role) guildData.antilink.whitelistRoles.push(role.id);
    if (user) guildData.antilink.whitelistUsers.push(user.id);
    if (channel) guildData.antilink.whitelistChannels.push(channel.id);

    await guildData.save();
    await interaction.editReply({ content: `✅ Antilink ${enable === 'on' ? 'attivato' : 'disattivato'}!\nLink Discord sempre permessi. Whitelist aggiornata.` });
  }
};