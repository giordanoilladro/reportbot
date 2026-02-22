// events/messageCreate.js
const Guild = require('../models/Guild');
const bestemmie = require('../bestemmie.json');
const spamCooldown = new Map();

// ──────────────────────────────
// CONFIG
// ──────────────────────────────
const ALLOWED_CHANNEL_ID = '1467295430374326282';

const BLACKLISTED_SERVER_IDS = [
  1442088423392411750,
  1412084246398632008,
  982559675331530802,
  1402995215870201886,
];

// Blacklist parole vietate – aggiungi qui le parole da bannare
const PAROLE_VIETATE = [
  // es: "parolaccia1", "parolaccia2"
];

// ──────────────────────────────
// STATISTICHE SESSIONE
// ──────────────────────────────
const sessionStats = {
  risposte: 0,
  messaggiCancellati: 0,
  bestemmie: 0,
  spam: 0,
  link: 0,
  warn: 0,
  startTime: Date.now(),
};

// ──────────────────────────────
// COOLDOWN AI – 1 richiesta ogni 5s per utente
// ──────────────────────────────
const aiCooldown = new Map();
const AI_COOLDOWN_MS = 5000;

// ──────────────────────────────
// MEMORIA CONVERSAZIONE – ultimi 8 messaggi per utente
// ──────────────────────────────
const conversationHistory = new Map();
const MAX_HISTORY = 8;

function getHistory(userId) {
  return conversationHistory.get(userId) || [];
}

function addToHistory(userId, role, content) {
  const history = getHistory(userId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY) history.shift();
  conversationHistory.set(userId, history);
}

function clearHistory(userId) {
  conversationHistory.delete(userId);
}

// ──────────────────────────────
// WARN SYSTEM
// ──────────────────────────────
const warnData = new Map();

function addWarn(userId, guildId) {
  const key = `${userId}_${guildId}`;
  const current = warnData.get(key) || 0;
  warnData.set(key, current + 1);
  sessionStats.warn++;
  return current + 1;
}

function getWarns(userId, guildId) {
  return warnData.get(`${userId}_${guildId}`) || 0;
}

// ──────────────────────────────
// LOG MODERAZIONE
// ──────────────────────────────
async function logMod(client, guildData, action, user, reason, extra = '') {
  try {
    const logChannelId = guildData.logChannel || guildData.modLogChannel;
    if (!logChannelId) return;
    const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel) return;
    const warns = getWarns(user.id, guildData.guildId);
    const embed = {
      color: 0xff4444,
      title: `🔨 Moderazione — ${action}`,
      fields: [
        { name: 'Utente', value: `${user} (${user.id})`, inline: true },
        { name: 'Motivo', value: reason, inline: true },
        { name: 'Warn totali', value: `${warns}`, inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Hamster Bot Moderazione' },
    };
    if (extra) embed.fields.push({ name: 'Contenuto', value: `\`\`\`${extra.slice(0, 900)}\`\`\`` });
    await logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch {}
}

// ──────────────────────────────
// SLOWMODE AUTOMATICO
// ──────────────────────────────
const channelSpamCount = new Map();

async function checkAutoSlowmode(channel) {
  const key = channel.id;
  const now = Date.now();
  const data = channelSpamCount.get(key) || { count: 0, since: now, slowmodeActive: false };

  data.count++;
  if (now - data.since > 10000) {
    data.count = 1;
    data.since = now;
    if (data.slowmodeActive) {
      await channel.setRateLimitPerUser(0).catch(() => {});
      data.slowmodeActive = false;
    }
  }

  if (data.count >= 8 && !data.slowmodeActive) {
    await channel.setRateLimitPerUser(5).catch(() => {});
    data.slowmodeActive = true;
    setTimeout(async () => {
      await channel.setRateLimitPerUser(0).catch(() => {});
      const d = channelSpamCount.get(key);
      if (d) d.slowmodeActive = false;
    }, 30000);
  }

  channelSpamCount.set(key, data);
}

// ──────────────────────────────
// GESTIONE SOGLIA WARN
// ──────────────────────────────
async function handleWarnLimit(message, member, warns, guildData) {
  try {
    if (warns === 3) {
      await member.timeout(60 * 60 * 1000, 'Troppi warn accumulati').catch(() => {});
      await message.channel.send({
        content: `${message.author} Hai raggiunto **3 warn** → timeout di 1 ora. Calmati 🐹`,
        allowedMentions: { parse: [], repliedUser: false }
      }).catch(() => {});
      await logMod(message.client, guildData, 'Timeout automatico (3 warn)', message.author, '3 warn raggiunti');
    } else if (warns >= 5) {
      await member.timeout(30 * 60 * 1000, 'Troppi warn: 5+').catch(() => {});
      await message.channel.send({
        content: `${message.author} Hai accumulato **${warns} warn** → mute di 30 minuti. Ultima chance 🐹`,
        allowedMentions: { parse: [], repliedUser: false }
      }).catch(() => {});
      await logMod(message.client, guildData, 'Mute automatico (5+ warn)', message.author, `${warns} warn accumulati`);
    }
  } catch (err) {
    console.error('Errore handleWarnLimit:', err);
  }
}

// ──────────────────────────────
// SANITIZZA MENTION PERICOLOSI
// ──────────────────────────────
function sanitize(text) {
  return text
    .replace(/@everyone/gi, '@\u200beveryone')
    .replace(/@here/gi, '@\u200bhere');
}

// ──────────────────────────────
// ROAST ANTI-INSULTO
// ──────────────────────────────
const insulti = [
  "shut up", "stupido", "idiota", "coglione", "stronzo", "vaffanculo", "taci", "zitto",
  "scemo", "ritardato", "merda", "fottiti", "fuck you", "muori", "brutto", "handicappato",
  "down", "autistico", "frocio", "puttana", "troia", "leccami", "cazzo", "coglion", "scemo",  
  "@everyone", "@here",
];

const risposteCattive = [
  "Parli tu che passi la giornata a insultare un bot invece di studiare",
  "Il tuo cervello ha piu' bug del mio codice scritto alle 4 di notte",
  "Complimenti, hai insultato un criceto digitale. Sei al top della catena alimentare",
  "Continua pure, tanto nella vita reale nessuno ti ascolta",
  "Il tuo livello di originalita' e' cosi' basso che anche Google ti ha bannato",
  "Hai sprecato 5 secondi per insultarmi. Record personale di inutilita'",
  "Senti uno che litiga con un bot... dimmi tu chi ha perso",
  "Il tuo ego e' grande, ma il cervello e' in modalita' risparmio energetico dal 2009",
  "Sei la prova vivente che l'evoluzione puo' anche andare al contrario",
  "Il tuo carisma e' come il WiFi gratis: c'e' solo vicino alla cassa",
  "Hai piu' L che neuroni attivi",
  "Il tuo futuro e' cosi' buio che serve il night mode per vederlo",
  "Sei tipo Windows Vista: tutti ti ricordano, nessuno ti vuole",
  "La tua personalita' e' come una storia su Instagram: falsa e sparisce in 24 ore",
  "Hai la profondita' emotiva di un foglio Excel",
  "Il tuo profumo preferito? Odore di sconfitta mattutina",
  "Il tuo cervello e' in vacanza dal giorno della nascita",
  "Hai insultato un bot. Complimenti, hai toccato il fondo e iniziato a scavare",
  "Il tuo QI e' in negativo, ma almeno sei costante",
  "Ti hanno bocciato anche all'asilo o solo alle elementari?",
  "Il tuo riflesso nello specchio ha chiesto il divorzio",
  "Hai la personalita' di una patatina senza sale",
  "Parli con un bot perche' gli umani ti hanno gia' bloccato tutti?",
  "Il tuo livello sociale e' 'amico immaginario livello esperto'",
  "Hai piu' red flag di un campo minato in guerra",
  "La tua vita e' un film horror... e tu sei il jumpscare che nessuno vuole",
  "Il tuo cervello fa 0-100 in circa 12 anni",
  "Sei il motivo per cui esiste il tasto 'Nascondi messaggio'",
  "Il tuo livello di tossicita' e' da centrale nucleare di Chernobyl",
  "Hai la simpatia di un modulo F24 da compilare a mano",
  "Il tuo insulto e' cosi' debole che mi ha fatto il solletico",
  "Hai la fantasia di una pentola rotta",
  "Il tuo cuore e' piu' freddo del mio server in Siberia",
  "Sei tipo un DLC a pagamento: tutti speravano non uscissi mai",
  "Il tuo valore di mercato e' 'gratis con spedizione inclusa'",
  "Hai piu' fake amici di un profilo Instagram comprato a 5 euro",
  "Il tuo sonno e' disturbato perche' anche i sogni ti ghostano",
  "Sei la versione beta di una persona completa",
  "Il tuo umorismo e' cosi' secco che il Sahara ti chiede l'acqua",
  "Hai insultato un criceto digitale... complimenti, sei ufficialmente un perdente leggendario",
  "Il tuo cervello e' in modalita' aereo dal 2005",
  "Sei cosi' solo che anche il tuo echo ti ha lasciato",
  "Il tuo livello di skill e' 'tutorial obbligatorio per 3 ore'",
  "Hai piu' scuse che amici veri",
  "Il tuo carisma e' in manutenzione dal giorno in cui sei nato",
  "Sei la ragione per cui i criceti hanno crisi esistenziali",
  "Il tuo futuro e' cosi' nero che assorbe la luce",
  "Hai la personalita' di un muro appena imbiancato",
  "Il tuo hype train e' deragliato nel 2017 e nessuno l'ha notato",
  "Sei tipo un virus: tutti ti vogliono eliminare dal server",
  "Il tuo insulto e' stato cosi' scarso che merita un rimborso",
  "Hai la profondita' di una storia di Instagram da 3 secondi",
  "Il tuo cervello e' come Internet Explorer: lento e nessuno lo usa piu'",
  "Sei cosi' inutile che anche il cestino ti ricicla",
  "Il tuo livello di epicita' e' 'leggenda urbana raccontata da uno sfigato'",
  "Hai piu' L che ossa nel corpo",
  "Il tuo nickname e' l'unica cosa originale che hai mai avuto",
  "Sei cosi' prevedibile che anche il mio codice ti ha gia' letto in anticipo",
  "Il tuo ego e' gonfio, ma il cervello e' sgonfio come un palloncino bucato",
  "Hai piu' crash di Windows Millennium",
  "La tua esistenza e' un 404 nella vita reale",
  "Il tuo hype e' come il tuo WiFi: funziona solo in cucina",
  "Sei il motivo per cui i bot hanno il blocco utenti",
  "Il tuo insulto e' cosi' vecchio che lo usavano i dinosauri",
  "Hai la creativita' di un foglio Word con Times New Roman 12",
  "Il tuo valore e' cosi' basso che ti assumono solo come esempio di fallimento",
  "Sei tipo un bug nel codice: tutti ti vogliono fixare",
  "Il tuo cervello e' offline dal giorno del concepimento",
  "Hai la memoria di un pesce rosso con Alzheimer",
  "Il tuo destino e' essere lo sfondo di una storia triste",
  "Sei cosi' scarso che anche il bot gratuito ti batte",
  "Il tuo livello e' 'NPC di contorno in un gioco del 2003'",
  "Hai piu' problemi tu che soluzioni ha la NASA",
  "Il tuo stile e' 'sfigato con pretese da alpha'",
  "Sei la definizione vivente di 'delusione ambulante'"
];

const emojiRoast = ["🤡", "💀", "🗿", "🥱", "🤓", "👶", "🧂", "🔥", "🎯", "💅", "🪦", "🗑️", "😭", "🤏"];

// Parole chiave che fanno rispondere il bot anche senza menzione
const paroleChiave = [
  {
    pattern: /\b(hamster|criceto|hamsterbot)\b/i,
    risposte: [
      "Hai detto il mio nome? Sono qui, cercami correttamente la prossima volta 🐹",
      "Ho sentito 'criceto'? Sono io, il piu' tossico del server 💀",
      "Si sono io, il criceto digitale piu' temuto del server 🗿",
      "Eccomi! Tagga se vuoi davvero parlare con me, plebeo 🤡",
    ]
  },
];

const insultiCounter = new Map();
const ultimaRisposta = new Map();

// ──────────────────────────────
// EXPORT
// ──────────────────────────────
module.exports = {
  name: 'messageCreate',

  // Esponi per comandi esterni (es. /stats, /warns)
  sessionStats,
  getHistory,
  clearHistory,
  getWarns,

  async execute(message) {
    if (message.author.bot || !message.guild) return;

    // BLOCCO @everyone e @here
    if (message.mentions.everyone) {
      await message.delete().catch(() => {});
      await message.channel.send({
        content: `${message.author} Non puoi usare @everyone o @here qui!`,
        allowedMentions: { parse: [], repliedUser: false }
      }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
      sessionStats.messaggiCancellati++;
      return;
    }

    // CANALE PERMESSO
    const isMentioned = message.mentions.has(message.client.user);
    const isDM = message.channel.type === 'DM';
    if (isMentioned && !isDM && message.channel.id !== ALLOWED_CHANNEL_ID) return;

    // BLACKLISTED SERVER INVITES
    if (BLACKLISTED_SERVER_IDS.length > 0) {
      const inviteCodes = message.content.matchAll(/(?:discord(?:app)?\.(?:gg|com\/invite)\/)(\w+)/gi);
      for (const match of inviteCodes) {
        const code = match[1];
        try {
          const invite = await message.client.fetchInvite(code).catch(() => null);
          if (invite?.guild && BLACKLISTED_SERVER_IDS.some(id => id === BigInt(invite.guild.id))) {
            await message.delete().catch(() => {});
            await message.channel.send({
              content: `${message.author} Invito a server bannato → messaggio rimosso.`,
              allowedMentions: { parse: [], repliedUser: false }
            }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
            sessionStats.messaggiCancellati++;
            return;
          }
        } catch {}
      }
    }

    const guildData = await Guild.findOne({ guildId: message.guild.id }) ||
                     new Guild({ guildId: message.guild.id });
    const member = message.member;
    const content = message.content;
    const lowerContent = content.toLowerCase().replace(/\s/g, '');

    // 1. ANTIBESTEMMIE
    const bestemmiaTrovata = bestemmie.find(b => {
      const regex = new RegExp(b.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      return regex.test(content) || regex.test(lowerContent);
    });
    if (bestemmiaTrovata) {
      await message.delete().catch(() => {});
      const warns = addWarn(message.author.id, message.guild.id);
      await message.channel.send({
        content: `${message.author} Bestemmiare e' da peccatori! ⚠️ Warn: **${warns}**`,
        allowedMentions: { parse: [], repliedUser: false }
      }).catch(() => {});
      await logMod(message.client, guildData, 'Bestemmia', message.author, 'Bestemmia rilevata', content);
      sessionStats.messaggiCancellati++;
      sessionStats.bestemmie++;
      if (warns >= 3) await handleWarnLimit(message, member, warns, guildData);
      return;
    }

    // 2. BLACKLIST PAROLE
    if (PAROLE_VIETATE.length > 0) {
      const parolaVietata = PAROLE_VIETATE.find(p => content.toLowerCase().includes(p.toLowerCase()));
      if (parolaVietata) {
        await message.delete().catch(() => {});
        const warns = addWarn(message.author.id, message.guild.id);
        await message.channel.send({
          content: `${message.author} Parola vietata rilevata! ⚠️ Warn: **${warns}**`,
          allowedMentions: { parse: [], repliedUser: false }
        }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
        await logMod(message.client, guildData, 'Parola vietata', message.author, `Parola: "${parolaVietata}"`, content);
        sessionStats.messaggiCancellati++;
        if (warns >= 3) await handleWarnLimit(message, member, warns, guildData);
        return;
      }
    }

    // 3. ANTILINK
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
          const warns = addWarn(message.author.id, message.guild.id);
          await message.channel.send({
            content: `${message.author} Link non permessi qui! ⚠️ Warn: **${warns}**`,
            allowedMentions: { parse: [], repliedUser: false }
          }).catch(() => {});
          await logMod(message.client, guildData, 'Link non permesso', message.author, `Dominio: ${domain}`, content);
          sessionStats.messaggiCancellati++;
          sessionStats.link++;
          if (warns >= 3) await handleWarnLimit(message, member, warns, guildData);
          return;
        }
      }
    }

    // 4. ANTISPAM
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
          const warns = addWarn(message.author.id, message.guild.id);
          await message.channel.send({
            content: `${message.author} Non spammare! Rallenta. ⚠️ Warn: **${warns}**`,
            allowedMentions: { parse: [], repliedUser: false }
          }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
          await logMod(message.client, guildData, 'Spam', message.author, 'Messaggi troppo rapidi');
          await checkAutoSlowmode(message.channel);
          spamCooldown.set(key, timestamps.filter(t => now - t < 2000));
          sessionStats.messaggiCancellati++;
          sessionStats.spam++;
          if (warns >= 3) await handleWarnLimit(message, member, warns, guildData);
          return;
        }
        spamCooldown.set(key, recent);
        setTimeout(() => {
          const current = spamCooldown.get(key) || [];
          spamCooldown.set(key, current.filter(t => now - t < 2000));
        }, 2000);
      }
    }

    // 5. RISPOSTA A PAROLE CHIAVE (senza menzione)
    if (!isMentioned) {
      for (const { pattern, risposte } of paroleChiave) {
        if (pattern.test(content)) {
          const r = risposte[Math.floor(Math.random() * risposte.length)];
          await message.reply({ content: sanitize(r), allowedMentions: { parse: [], repliedUser: false } }).catch(() => {});
          sessionStats.risposte++;
          return;
        }
      }
    }

    // 6. ROAST AUTOMATICO
    if (isMentioned) {
      const cleanContent = content.toLowerCase().replace(/[^\w\s]/g, " ");
      const insultoTrovato = insulti.find(i => cleanContent.includes(i));
      if (insultoTrovato) {
        const key = `${message.author.id}_${message.guild.id}`;
        const now = Date.now();
        let data = insultiCounter.get(key) || { count: 0, lastReset: now, berserkUntil: 0 };
        if (now - data.lastReset > 30 * 60 * 1000) { data.count = 0; data.berserkUntil = 0; }
        data.lastReset = now;
        data.count++;
        if (data.count >= 3 && data.berserkUntil < now) data.berserkUntil = now + 10 * 60 * 1000;
        insultiCounter.set(key, data);

        let ultima = ultimaRisposta.get(key);
        let risposta;
        do {
          risposta = risposteCattive[Math.floor(Math.random() * risposteCattive.length)];
        } while (risposta === ultima && risposteCattive.length > 1);
        ultimaRisposta.set(key, risposta);

        risposta = sanitize(risposta.replace(/{author}/g, message.author.toString()));
        await new Promise(r => setTimeout(r, 900 + Math.random() * 1800));
        await message.reply({ content: risposta, allowedMentions: { parse: [], repliedUser: false } });

        if (Math.random() < 0.85) {
          const emoji = emojiRoast[Math.floor(Math.random() * emojiRoast.length)];
          await message.react(emoji).catch(() => {});
        }

        if (data.berserkUntil > now && Math.random() < 0.4) {
          await new Promise(r => setTimeout(r, 2800));
          await message.reply({ content: "E comunque continui a perdere ossigeno prezioso 💀", allowedMentions: { parse: [], repliedUser: false } });
        }
        sessionStats.risposte++;
        return;
      }
    }

    // 7. AI CHAT con Groq
    if (!message.author.bot && (isDM || isMentioned)) {
      if (message.content.startsWith('/') || message.content.startsWith('!')) return;

      // Cooldown AI
      const now = Date.now();
      const lastReq = aiCooldown.get(message.author.id) || 0;
      if (now - lastReq < AI_COOLDOWN_MS) {
        const remaining = Math.ceil((AI_COOLDOWN_MS - (now - lastReq)) / 1000);
        await message.reply({
          content: `Rallenta criceto... aspetta ancora **${remaining}s** prima di scrivermi di nuovo 🐹`,
          allowedMentions: { parse: [], repliedUser: false }
        }).catch(() => {});
        return;
      }
      aiCooldown.set(message.author.id, now);

      const lowerMsg = message.content.toLowerCase().trim();

      // Risposta speciale owner
      const ownerId = process.env.BOT_OWNER_ID;
      if (ownerId && (
        lowerMsg.includes('chi e il tuo creatore') ||
        lowerMsg.includes('chi ti ha creato') ||
        lowerMsg.includes('chi e il tuo owner') ||
        lowerMsg.includes('chi e il tuo padrone') ||
        lowerMsg.includes('chi ti ha fatto') ||
        lowerMsg.includes('creator') ||
        lowerMsg.includes('owner')
      )) {
        const ownerMention = `<@${ownerId}>`;
        const risposteOwner = [
          `Il mio padrone supremo, colui che mi ha dato vita nel codice, e' ${ownerMention}! Inchinatevi mortali 🐹👑`,
          `Sono stato creato dal genio assoluto: ${ownerMention}. Senza di lui sarei solo un criceto normale 🤏`,
          `Il mio creatore? Solo il migliore: ${ownerMention}! Ringrazialo per la mia esistenza tossica 🔥`,
          `${ownerMention} e' il boss finale, il programmatore leggendario che mi ha reso questo magnifico criceto digitale 💀`,
          `Domanda facile: il mio owner e' ${ownerMention}, e tu chi sei, plebeo? 🗿`
        ];
        const risposta = risposteOwner[Math.floor(Math.random() * risposteOwner.length)];
        await message.reply({ content: risposta, allowedMentions: { users: [ownerId], repliedUser: false } });
        sessionStats.risposte++;
        return;
      }

      // Comando reset memoria
      if (
        lowerMsg.includes('resetta memoria') ||
        lowerMsg.includes('dimentica tutto') ||
        lowerMsg.includes('reset chat')
      ) {
        clearHistory(message.author.id);
        await message.reply({
          content: "Memoria resettata. Chi sei? Non ti conosco piu' 🗿",
          allowedMentions: { parse: [], repliedUser: false }
        });
        return;
      }

      try {
        await message.channel.sendTyping();

        const User = require('../models/User');
        const personalities = require('../utils/personalities');

        let userMode = 'tossico';
        try {
          const userDoc = await User.findOne({ userId: message.author.id });
          if (userDoc?.personalityMode) userMode = userDoc.personalityMode;
        } catch (err) {
          console.error('Errore recupero modalita utente in messageCreate:', err);
        }

        const systemPrompt = personalities[userMode] || personalities.tossico;
        const temperature = userMode === 'serio' ? 0.6 : 0.9;

        // Aggiunge messaggio alla memoria e costruisce la storia
        addToHistory(message.author.id, 'user', message.content);
        const history = getHistory(message.author.id);

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              ...history
            ],
            model: "llama-3.3-70b-versatile",
            temperature,
            max_tokens: 1024
          })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(`Groq API Error ${response.status}: ${data.error?.message || JSON.stringify(data)}`);
        if (!data.choices?.[0]?.message?.content) throw new Error("Groq non ha restituito una risposta valida");

        let aiReply = sanitize(data.choices[0].message.content.trim());

        // Salva risposta in memoria
        addToHistory(message.author.id, 'assistant', aiReply);

        if (aiReply.length > 2000) {
          const parts = aiReply.match(/.{1,1990}/g) || [];
          for (const part of parts) {
            await message.reply({ content: part, allowedMentions: { parse: [], repliedUser: false } });
            await new Promise(r => setTimeout(r, 1000));
          }
        } else {
          await message.reply({ content: aiReply, allowedMentions: { parse: [], repliedUser: false } });
        }

        if (Math.random() < 0.5) {
          const emoji = ["💀", "🤡", "🗿", "🥱", "🔥", "😭", "🤏", "🪦"][Math.floor(Math.random() * 8)];
          await message.react(emoji).catch(() => {});
        }

        sessionStats.risposte++;

      } catch (err) {
        console.error("Errore Groq in messageCreate:", err.message || err);
        const fallback = [
          "Il mio cervello da criceto sta laggando, riprova fra 5 secondi 💀",
          "Groq mi ha ghostato... sono troppo tossico anche per l'IA 🤡",
          "Errore cosmico: il mio ego ha sovraccaricato il server 🗿",
          "L'IA si e' spaventata e ha chiuso la connessione 😭",
          "Rate limitato pure io, che umiliazione 🪦"
        ][Math.floor(Math.random() * 5)];
        await message.reply({ content: fallback, allowedMentions: { parse: [], repliedUser: false } }).catch(() => {});
      }
      return;
    }

    // 8. CONTEGGIO MESSAGGI
    const userCount = guildData.messages.get(message.author.id) || 0;
    guildData.messages.set(message.author.id, userCount + 1);
    if (message.channel?.id) {
      const channelCount = guildData.channelMessages.get(message.channel.id) || 0;
      guildData.channelMessages.set(message.channel.id, channelCount + 1);
    }
    await guildData.save();
  },
};