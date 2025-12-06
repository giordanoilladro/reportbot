// events/messageCreate.js
const Guild = require('../models/Guild');
const bestemmie = require('../bestemmie.json');
const spamCooldown = new Map(); // userId_guildId -> [timestamps]

// ──────────────────────────────
// ROAST ANTI-INSULTO (nuova sezione)
// ──────────────────────────────
const insulti = [
  "shut up", "stupido", "idiota", "coglione", "stronzo", "vaffanculo", "taci", "zitto",
  "scemo", "ritardato", "merda", "fottiti", "fuck you", "muori", "brutto", "handicappato",
  "down", "autistico", "frocio", "puttana", "troia"
];

// Risposte dolci/sarcastica (prime 2 volte)
const risposteDolci = [
  "Oddio mi hai ferito profondamente... ora vado a piangere nel mio codice 💔",
  "Grazie del feedback! Aggiorno il database: {author} = senza fantasia negli insulti ✅",
  "Scusa stavo guardando il soffitto, è più interessante di te in questo momento",
  "Il mio creatore mi ha vietato di rispondere agli insulti... ma per te faccio un'eccezione 🥰",
  "Mi hai menzionato per insultarmi? Che onore, mi sento famoso",
  "Il criceto dentro di me è triste... ma sopravviverà. Tu invece?",
  "Wow, mi hai distrutto psicologicamente. Vado in terapia per 0.0003 secondi"
];

// Risposte CATTIVE (dalla 3ª volta in poi per 10 minuti)
const risposteCattive = [
  "Parli tu che il tuo picco della giornata è insultare un bot su Discord",
  "Il tuo cervello ha più bug del mio codice beta del 2021",
  "Continui a insultarmi perché nella vita reale nessuno ti calcola, vero?",
  "Senti uno che perde tempo a litigare con un criceto digitale… chi è il vero perdente?",
  "Torna quando avrai una personalità invece di copiare insulti da TikTok del 2019",
  "Il tuo livello di originalità è talmente basso che anche le formiche ti guardano dall’alto",
  "Complimenti, hai sprecato 5 secondi della tua vita per scrivere a un bot. Record personale?",
  "Sei il motivo per cui nei termini di servizio c’è scritto “non essere stupido”",
  "La tua bio Discord dice “pro player” ma l’unica cosa che sai killare è la tua dignità",
  "Hai finito le munizioni o continui a sparare a vuoto come sempre?",
  "Tranquillo, capisco: è dura essere te tutti i giorni",
  "Il tuo ego è come il tuo Wi-Fi: 1 tacca e pieno di interferenze"
];

const emojiRoast = ["🤡", "💀", "🗿", "🥱", "🤓", "👶", "🧂", "🔥", "🎯"];

// Contatore insulti per utente (per server) → modalità berserk dopo 3
const insultiCounter = new Map(); // chiave: "userId_guildId"

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const guildData = await Guild.findOne({ guildId: message.guild.id }) ||
                     new Guild({ guildId: message.guild.id });
    const member = message.member;
    const content = message.content;
    const lowerContent = content.toLowerCase().replace(/\s/g, '');

    // ──────────────────────────────
    // 1. ANTIBESTEMMIE
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
      return;
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
    // 3. ANTISPAM
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
        const recent = timestamps.filter(t => now - t < 2000);
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
    // 4. ROAST AUTOMATICO QUANDO INSULTANO IL BOT
    // ──────────────────────────────
    if (message.mentions.has(message.client.user)) {
      const cleanContent = content.toLowerCase().replace(/[^\w\s]/g, " ");
      const insultoTrovato = insulti.find(i => cleanContent.includes(i));

      if (insultoTrovato) {
        const key = `${message.author.id}_${message.guild.id}`;
        const now = Date.now();

        let data = insultiCounter.get(key) || { count: 0, lastReset: now, berserkUntil: 0 };
        
        // Reset contatore dopo 30 minuti di silenzio
        if (now - data.lastReset > 30 * 60 * 1000) {
          data.count = 0;
          data.berserkUntil = 0;
        }
        data.lastReset = now;
        data.count++;

        // Attiva modalità berserk dopo 3 insulti
        if (data.count >= 3 && data.berserkUntil < now) {
          data.berserkUntil = now + 10 * 60 * 1000; // 10 minuti di roast
        }

        insultiCounter.set(key, data);

        const inBerserk = data.berserkUntil > now;
        const risposte = inBerserk ? risposteCattive : risposteDolci;
        let risposta = risposte[Math.floor(Math.random() * risposte.length)];

        risposta = risposta
          .replace(/{author}/g, message.author.toString())
          .replace(/{insulto}/g, insultoTrovato);

        // Delay naturale
        await new Promise(r => setTimeout(r, 800 + Math.random() * 1500));
        await message.reply(risposta);

        // Reazione clown (più probabile in berserk)
        if (inBerserk || Math.random() < 0.65) {
          const emoji = emojiRoast[Math.floor(Math.random() * emojiRoast.length)];
          await message.react(emoji).catch(() => {});
        }

        // Messaggio bonus raro in berserk
        if (inBerserk && Math.random() < 0.3) {
          await new Promise(r => setTimeout(r, 2200));
          await message.reply("Hai svegliato il criceto sbagliato 🐹🔥");
        }

        // Non blocca il resto del codice (continua con il conteggio messaggi)
      }
    }

    // ──────────────────────────────
    // 5. CONTEGGIO MESSAGGI per la leaderboard
    // ──────────────────────────────
    const userCount = guildData.messages.get(message.author.id) || 0;
    guildData.messages.set(message.author.id, userCount + 1);

    if (message.channel?.id) {
      const channelCount = guildData.channelMessages.get(message.channel.id) || 0;
      guildData.channelMessages.set(message.channel.id, channelCount + 1);
    }

    // Salva una sola volta alla fine
    await guildData.save();
  },
};