// routes/guild.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const { client } = require('../index'); // <-- IMPORTANTE: punta al tuo index.js
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

// SALVA CONFIG GENERALE + REACTION ROLES
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
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// INVIA/AGGIORNA MESSAGGIO REACTION ROLES
router.post('/:id/reactionrole/send', async (req, res) => {
  try {
    const guildId = req.params.id;
    const config = req.body;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ success: false, error: "Server non trovato" });

    const channel = guild.channels.cache.get(config.channelId);
    if (!channel || channel.type !== 0) return res.status(400).json({ success: false, error: "Canale non valido" });

    const embed = new MessageEmbed()
      .setTitle(config.title || "Scegli i tuoi ruoli!")
      .setDescription(config.description || "")
      .setColor(config.color || "#5865F2");
    if (config.thumbnail) embed.setThumbnail(config.thumbnail);

    const buttons = [];
    for (const r of config.roles || []) {
      if (!r.roleId || !guild.roles.cache.has(r.roleId)) continue;

      const style = { Primary: 'PRIMARY', Secondary: 'SECONDARY', Success: 'SUCCESS', Danger: 'DANGER' }[r.style] || 'SECONDARY';

      buttons.push(
        new MessageButton()
          .setCustomId(`rr_${r.roleId}`)
          .setLabel(r.label || guild.roles.cache.get(r.roleId).name)
          .setEmoji(r.emoji || null)
          .setStyle(style)
      );
    }

    const rows = [];
    for (let i = 0; i < 3; i++) {
      const row = new MessageActionRow();
      buttons.slice(i * 5, (i + 1) * 5).forEach(b => row.addComponents(b));
      if (row.components.length) rows.push(row);
    }

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

    // Salva messageId
    let servers = JSON.parse(fs.readFileSync('./data/servers.json', 'utf-8'));
    if (!servers[guildId]) servers[guildId] = {};
    if (!servers[guildId].reactionroles) servers[guildId].reactionroles = {};
    servers[guildId].reactionroles.messageId = message.id;
    fs.writeFileSync('./data/servers.json', JSON.stringify(servers, null, 2));

    res.json({ success: true, messageId: message.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;