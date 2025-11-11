// routes/guild.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const { client } = require('../index'); // Assicurati che exporti il client correttamente
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

// === DASHBOARD SERVER (GET) ===
router.get('/:id', async (req, res) => {
  try {
    const guildId = req.params.id;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      console.log(`[DASHBOARD] Server non trovato: ${guildId}`);
      return res.redirect('/');
    }

    // Filtra i canali testuali e annuncio
    const channels = guild.channels.cache
      .filter(c => c.type === 0 || c.type === 5)
      .map(c => ({ id: c.id, name: c.name }));

    // Filtra i ruoli normali (non gestiti da integrazioni)
    const roles = guild.roles.cache
      .filter(r => !r.managed)
      .map(r => ({ id: r.id, name: r.name }));

    // Carica impostazioni salvate
    let settings = {};
    if (fs.existsSync('./data/servers.json')) {
      const data = JSON.parse(fs.readFileSync('./data/servers.json', 'utf-8'));
      settings = data[guildId] || {};
    }

    // Renderizza la pagina dashboard.ejs
    res.render('dashboard', {
      user: req.user || null,
      guilds: client.guilds.cache.map(g => ({ id: g.id, name: g.name, icon: g.icon })),
      selectedGuild: guild,
      channels,
      roles,
      settings
    });

  } catch (err) {
    console.error('[DASHBOARD ERROR]', err);
    res.status(500).send('Errore nel caricamento della dashboard');
  }
});

// === SALVA CONFIG GENERALE + REACTION ROLES ===
router.post('/:id/save', async (req, res) => {
  try {
    const guildId = req.params.id;
    const data = req.body;

    let servers = {};
    if (fs.existsSync('./data/servers.json')) {
      servers = JSON.parse(fs.readFileSync('./data/servers.json', 'utf-8'));
    }

    servers[guildId] = { ...servers[guildId], ...data };
    fs.writeFileSync('./data/servers.json', JSON.stringify(servers, null, 2));

    res.json({ success: true });
  } catch (err) {
    console.error('[SAVE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// === INVIA/AGGIORNA MESSAGGIO REACTION ROLES ===
router.post('/:id/reactionrole/send', async (req, res) => {
  try {
    const guildId = req.params.id;
    const config = req.body;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ success: false, error: 'Server non trovato' });

    const channel = guild.channels.cache.get(config.channelId);
    if (!channel || channel.type !== 0)
      return res.status(400).json({ success: false, error: 'Canale non valido' });

    // Embed principale
    const embed = new MessageEmbed()
      .setTitle(config.title || 'Scegli i tuoi ruoli!')
      .setDescription(config.description || '')
      .setColor(config.color || '#5865F2');

    if (config.thumbnail) embed.setThumbnail(config.thumbnail);

    // Bottoni
    const buttons = [];
    for (const r of config.roles || []) {
      if (!r.roleId || !guild.roles.cache.has(r.roleId)) continue;

      const styleMap = {
        Primary: 'PRIMARY',
        Secondary: 'SECONDARY',
        Success: 'SUCCESS',
        Danger: 'DANGER'
      };
      const style = styleMap[r.style] || 'SECONDARY';

      const button = new MessageButton()
        .setCustomId(`rr_${r.roleId}`)
        .setLabel(r.label || guild.roles.cache.get(r.roleId).name)
        .setStyle(style);

      if (r.emoji) button.setEmoji(r.emoji);
      buttons.push(button);
    }

    // Dividi in righe da 5
    const rows = [];
    for (let i = 0; i < Math.ceil(buttons.length / 5); i++) {
      const row = new MessageActionRow().addComponents(buttons.slice(i * 5, (i + 1) * 5));
      rows.push(row);
    }

    // Invia o modifica il messaggio
    let message;
    if (config.messageId) {
      try {
        message = await channel.messages.fetch(config.messageId);
        await message.edit({ embeds: [embed], components: rows });
      } catch {
        message = null;
      }
    }

    if (!message) {
      message = await channel.send({ embeds: [embed], components: rows });
    }

    // Salva messageId nel file
    let servers = {};
    if (fs.existsSync('./data/servers.json')) {
      servers = JSON.parse(fs.readFileSync('./data/servers.json', 'utf-8'));
    }
    if (!servers[guildId]) servers[guildId] = {};
    if (!servers[guildId].reactionroles) servers[guildId].reactionroles = {};
    servers[guildId].reactionroles.messageId = message.id;

    fs.writeFileSync('./data/servers.json', JSON.stringify(servers, null, 2));

    res.json({ success: true, messageId: message.id });
  } catch (err) {
    console.error('[REACTION ROLE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
