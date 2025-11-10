const fs = require('fs');
const path = require('path');
const GuildSettings = require('../models/GuildReaction'); // <-- usa il modello che preferisci
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // === COMANDI SLASH ===
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error('Errore comando:', error);
        const reply = { content: 'Errore durante l\'esecuzione del comando!', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    }

    // === GESTIONE BOTTONI ===
    else if (interaction.isButton()) {

      // --- REACTION ROLES (NUOVO!) ---
      if (interaction.customId.startsWith('rr_')) {
        const roleId = interaction.customId.replace('rr_', '');
        const guildId = interaction.guild.id;

        // Carica config da servers.json
        let servers = {};
        try {
          if (fs.existsSync('./data/servers.json')) {
            servers = JSON.parse(fs.readFileSync('./data/servers.json', 'utf-8'));
          }
        } catch (err) {
          console.error('Errore lettura servers.json:', err);
          return interaction.reply({ content: 'Errore interno, riprova più tardi.', ephemeral: true });
        }

        const config = servers[guildId]?.reactionroles;
        if (!config?.enabled) return;

        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ content: 'Ruolo non trovato!', ephemeral: true });

        try {
          if (interaction.member.roles.cache.has(roleId)) {
            await interaction.member.roles.remove(roleId);
            await interaction.reply({ content: `Ruolo **${role.name}** rimosso!`, ephemeral: true });
          } else {
            await interaction.member.roles.add(roleId);
            await interaction.reply({ content: `Ruolo **${role.name}** aggiunto!`, ephemeral: true });
          }
        } catch (err) {
          console.error('Errore gestione ruolo:', err);
          await interaction.reply({ content: 'Non ho i permessi per gestire questo ruolo!', ephemeral: true });
        }
        return; // <-- IMPORTANTE: blocca le altre gestioni
      }

      // --- VERIFICA (ESISTENTE - INALTERATO) ---
      if (interaction.customId.startsWith('verify_button_')) {
        const guildId = interaction.customId.split('_').pop();
        if (interaction.guild.id !== guildId) return;

        await interaction.deferReply({ ephemeral: true });

        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
        const verify = settings?.verify;

        if (!verify?.enabled || !verify.roleId) {
          return interaction.editReply({ content: 'Verifica non disponibile.' });
        }

        const role = interaction.guild.roles.cache.get(verify.roleId);
        if (!role) return interaction.editReply({ content: 'Ruolo non trovato.' });
        if (interaction.member.roles.cache.has(verify.roleId)) {
          return interaction.editReply({ content: 'Sei già verificato!' });
        }

        try {
          await interaction.member.roles.add(role);

          // === DM DI BENVENUTO ===
          try {
            const welcomeDM = new EmbedBuilder()
              .setTitle('Benvenuto su ' + interaction.guild.name + '!')
              .setDescription(verify.welcomeMessage || 'Grazie per esserti verificato!\nOra hai accesso completo al server.')
              .setColor(0x00ff00)
              .setThumbnail(interaction.guild.iconURL())
              .setTimestamp();

            await interaction.user.send({ embeds: [welcomeDM] });
          } catch (dmError) {
            console.log(`Impossibile inviare DM a ${interaction.user.tag}`);
          }

          // === LOG NEL CANALE STAFF ===
          if (settings?.logChannelId) {
            const logChannel = interaction.guild.channels.cache.get(settings.logChannelId);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle('Nuova Verifica')
                .setDescription(`${interaction.user} si è verificato!`)
                .addFields(
                  { name: 'Utente', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                  { name: 'Ruolo Assegnato', value: `<@&${verify.roleId}>`, inline: true }
                )
                .setColor(0x00ff00)
                .setTimestamp();

              try {
                await logChannel.send({ embeds: [logEmbed] });
              } catch (logError) {
                console.log('Errore invio log verifica:', logError);
              }
            }
          }

          const successEmbed = new EmbedBuilder()
            .setTitle('Verificato!')
            .setDescription('Benvenuto nel server!\nControlla i tuoi DM per un messaggio speciale.')
            .setColor(0x00ff00)
            .setTimestamp();

          await interaction.editReply({ embeds: [successEmbed] });

        } catch (err) {
          console.error('Errore assegnazione ruolo:', err);
          await interaction.editReply({ content: 'Errore: non posso assegnarti il ruolo.' });
        }
        return;
      }

      // --- TEST BENVENUTO ---
      else if (interaction.customId === 'welcome_test') {
        await interaction.reply({ content: 'Test benvenuto OK!', ephemeral: true });
      }
    }
  },
};