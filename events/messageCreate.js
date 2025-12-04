// events/messageCreate.js
const Guild = require('../models/Guild');
const bestemmie = require('../bestemmie.json');

const spamCooldown = new Map(); // userId_guildId -> [timestamps]

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const guildData = await Guild.findOne({ guildId: message.guild.id }) ||
                     new Guild({ guildId: message.guild.id });

    const member = message.member;
    const content = message.content;
    const lowerContent = content.toLowerCase().replace(/\s/g, ''); // rimuove spazi

    // ──────────────────────────────
    // 1. ANTIBESTEMMIE (molto più forte)
    // ──────────────────────────────
    const bestemmiaTrovata = bestemmie.find(b => {
      const regex = new RegExp(b.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      return regex.test(content) || regex.test(lowerContent);
    });

    if (bestemmiaTrovata) {
      await message.delete().catch(() => {});
      await message.channel.send({
        content: `${message.author} Bestemmiare è da peccatori!`,
        allowedMentions: { repliedUser: false }
      }).catch(() => {});
      return; // blocca tutto il resto
    }

    // ──────────────────────────────
    // 2. ANTILINK
    // ──────────────────────────────
    if (guildData.antilink?.enabled) {
      const hasLink = /(https?:\/\/[^\s]+)|(discord\.(gg|io|me)\/[^\s]+)/i.test(content);
      if (hasLink) {
        const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
        const url = urlMatch ? urlMatch[0] : '';
        let domain = '';
        try { domain = new URL(url).hostname.replace('www.', ''); }
        catch { domain = url.split('/')[2]?.replace('www.', '') || ''; }

        const isAllowedDomain = guildData.antilink.allowedDomains.some(d => domain.includes(d));
        const isWhitelisted = guildData.antilink.whitelistRoles.some(r => member.roles.cache.has(r)) ||
                              guildData.antilink.whitelistUsers.includes(member.id) ||
                              guildData.antilink.whitelistChannels.includes(message.channel.id);

        if (!isAllowedDomain && !isWhitelisted) {
          await message.delete().catch(() => {});
          await message.channel.send({
            content: `${message.author} Link non permessi qui! Solo link Discord o whitelist.`,
            allowedMentions: { repliedUser: false }
          }).catch(() => {});
          return;
        }
      }
    }

    // ──────────────────────────────
    // 3. ANTISPAM (3 messaggi in 2 secondi = delete + warn)
    // ──────────────────────────────
    if (guildData.antispam?.enabled) {
      const isWhitelisted = guildData.antispam.whitelistRoles.some(r => member.roles.cache.has(r)) ||
                            guildData.antispam.whitelistUsers.includes(member.id) ||
                            guildData.antispam.whitelistChannels.includes(message.channel.id);

      if (!isWhitelisted) {
        const key = `${message.author.id}_${message.guild.id}`;
        const now = Date.now();
        const timestamps = spamCooldown.get(key) || [];

        timestamps.push(now);
        const recent = timestamps.filter(t => now - t < 2000); // ultimi 2 secondi

        if (recent.length >= 3) {
          await message.delete().catch(() => {});
          await message.channel.send({
            content: `${message.author} Non spammare! Rallenta.`,
            allowedMentions: { repliedUser: false }
          }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
          spamCooldown.set(key, timestamps.filter(t => now - t < 2000));
          return;
        }

        spamCooldown.set(key, recent);
        setTimeout(() => {
          const current = spamCooldown.get(key) || [];
          spamCooldown.set(key, current.filter(t => now - t < 2000));
        }, 2000);
      }
    }

    // ──────────────────────────────
    // 4. CONTEGGIO MESSAGGI per la leaderboard
    // ──────────────────────────────
const userCount = guildData.messages.get(message.author.id) || 0;
    guildData.messages.set(message.author.id, userCount + 1);

    // Conteggio messaggi per canale testo (fondamentale per la sezione "CANALI TESTO PIÙ ATTIVI")
    if (message.channel?.id) {
      const channelCount = guildData.channelMessages.get(message.channel.id) || 0;
      guildData.channelMessages.set(message.channel.id, channelCount + 1);
    }

    // Salva tutto una volta sola alla fine
    await guildData.save();
  },
};