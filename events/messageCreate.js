// events/messageCreate.js
const Guild = require('../models/Guild');
const bestemmie = require('../bestemmie.json');
const spamCooldown = new Map();

const BLACKLISTED_SERVER_IDS = [
  1442088423392411750,
  1412084246398632008,
  982559675331530802,
  1402995215870201886,
];

// ──────────────────────────────
// ROAST ANTI-INSULTO – SEMPRE CATTIVO + 75+ RISPOSTE + ANTI-RIPETIZIONE
// ──────────────────────────────
const insulti = [
  "shut up", "stupido", "idiota", "coglione", "stronzo", "vaffanculo", "taci", "zitto",
  "scemo", "ritardato", "merda", "fottiti", "fuck you", "muori", "brutto", "handicappato",
  "down", "autistico", "frocio", "puttana", "troia", "leccami", "cazzo", "coglion", "scemo"
];

const risposteCattive = [
  "Parli tu che passi la giornata a insultare un bot invece di studiare",
  "Il tuo cervello ha più bug del mio codice scritto alle 4 di notte",
  "Complimenti, hai insultato un criceto digitale. Sei al top della catena alimentare",
  "Continua pure, tanto nella vita reale nessuno ti ascolta",
  "Il tuo livello di originalità è così basso che anche Google ti ha bannato",
  "Hai sprecato 5 secondi per insultarmi. Record personale di inutilità",
  "Senti uno che litiga con un bot... dimmi tu chi ha perso",
  "Il tuo ego è grande, ma il cervello è in modalità risparmio energetico dal 2009",
  "Sei la prova vivente che l'evoluzione può anche andare al contrario",
  "Il tuo carisma è come il WiFi gratis: c'è solo vicino alla cassa",
  "Hai più L che neuroni attivi",
  "Il tuo futuro è così buio che serve il night mode per vederlo",
  "Sei tipo Windows Vista: tutti ti ricordano, nessuno ti vuole",
  "La tua personalità è come una storia su Instagram: falsa e sparisce in 24 ore",
  "Hai la profondità emotiva di un foglio Excel",
  "Il tuo profumo preferito? Odore di sconfitta mattutina",
  "Il tuo cervello è in vacanza dal giorno della nascita",
  "Hai insultato un bot. Complimenti, hai toccato il fondo e iniziato a scavare",
  "Il tuo QI è in negativo, ma almeno sei costante",
  "Ti hanno bocciato anche all’asilo o solo alle elementari?",
  "Il tuo riflesso nello specchio ha chiesto il divorzio",
  "Hai la personalità di una patatina senza sale",
  "Parli con un bot perché gli umani ti hanno già bloccato tutti?",
  "Il tuo livello sociale è 'amico immaginario livello esperto'",
  "Hai più red flag di un campo minato in guerra",
  "La tua vita è un film horror... e tu sei il jumpscare che nessuno vuole",
  "Il tuo cervello fa 0-100 in circa 12 anni",
  "Sei il motivo per cui esiste il tasto 'Nascondi messaggio'",
  "Il tuo livello di tossicità è da centrale nucleare di Chernobyl",
  "Hai la simpatia di un modulo F24 da compilare a mano",
  "Il tuo insulto è così debole che mi ha fatto il solletico",
  "Hai la fantasia di una pentola rotta",
  "Il tuo cuore è più freddo del mio server in Siberia",
  "Sei tipo un DLC a pagamento: tutti speravano non uscissi mai",
  "Il tuo valore di mercato è 'gratis con spedizione inclusa'",
  "Hai più fake amici di un profilo Instagram comprato a 5 euro",
  "Il tuo sonno è disturbato perché anche i sogni ti ghostano",
  "Sei la versione beta di una persona completa",
  "Il tuo umorismo è così secco che il Sahara ti chiede l’acqua",
  "Hai insultato un criceto digitale… complimenti, sei ufficialmente un perdente leggendario",
  "Il tuo cervello è in modalità aereo dal 2005",
  "Sei così solo che anche il tuo echo ti ha lasciato",
  "Il tuo livello di skill è 'tutorial obbligatorio per 3 ore'",
  "Hai più scuse che amici veri",
  "Il tuo carisma è in manutenzione dal giorno in cui sei nato",
  "Sei la ragione per cui i criceti hanno crisi esistenziali",
  "Il tuo futuro è così nero che assorbe la luce",
  "Hai la personalità di un muro appena imbiancato",
  "Il tuo hype train è deragliato nel 2017 e nessuno l’ha notato",
  "Sei tipo un virus: tutti ti vogliono eliminare dal server",
  "Il tuo insulto è stato così scarso che merita un rimborso",
  "Hai la profondità di una storia di Instagram da 3 secondi",
  "Il tuo cervello è come Internet Explorer: lento e nessuno lo usa più",
  "Sei così inutile che anche il cestino ti ricicla",
  "Il tuo livello di epicità è 'leggenda urbana raccontata da uno sfigato'",
  "Hai più L che ossa nel corpo",
  "Il tuo nickname è l’unica cosa originale che hai mai avuto",
  "Sei così prevedibile che anche il mio codice ti ha già letto in anticipo",
  "Il tuo ego è gonfio, ma il cervello è sgonfio come un palloncino bucato",
  "Hai più crash di Windows Millennium",
  "La tua esistenza è un 404 nella vita reale",
  "Il tuo hype è come il tuo WiFi: funziona solo in cucina",
  "Sei il motivo per cui i bot hanno il blocco utenti",
  "Il tuo insulto è così vecchio che lo usavano i dinosauri",
  "Hai la creatività di un foglio Word con Times New Roman 12",
  "Il tuo valore è così basso che ti assumono solo come esempio di fallimento",
  "Sei tipo un bug nel codice: tutti ti vogliono fixare",
  "Il tuo cervello è offline dal giorno del concepimento",
  "Hai la memoria di un pesce rosso con Alzheimer",
  "Il tuo destino è essere lo sfondo di una storia triste",
  "Sei così scarso che anche il bot gratuito ti batte",
  "Il tuo livello è 'NPC di contorno in un gioco del 2003'",
  "Hai più problemi tu che soluzioni ha la NASA",
  "Il tuo stile è 'sfigato con pretese da alpha'",
  "Sei la definizione vivente di 'delusione ambulante'"
];

const emojiRoast = ["🤡", "💀", "🗿", "🥱", "🤓", "👶", "🧂", "🔥", "🎯", "💅", "🪦", "🗑️", "😭", "🤏"];

// Contatori per roast e berserk mode
const insultiCounter = new Map();
const ultimaRisposta = new Map();

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    // BLOCCO @everyone e @here
    if (message.mentions.everyone) {
      await message.delete().catch(() => {});
      await message.channel.send({
        content: `${message.author} Non puoi usare @everyone o @here qui!`,
        allowedMentions: { parse: [], repliedUser: false }
      }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
      return;
    }

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
              allowedMentions: { repliedUser: false }
            }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
            return;
          }
        } catch {} // invito scaduto o invalido → ignora
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
      await message.channel.send({
        content: `${message.author} Bestemmiare è da peccatori!`,
        allowedMentions: { repliedUser: false }
      }).catch(() => {});
      return;
    }

    // 2. ANTILINK
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

    // 3. ANTISPAM
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

    // 4. ROAST AUTOMATICO (sempre attivo e cattivissimo)
    if (message.mentions.has(message.client.user)) {
      const cleanContent = content.toLowerCase().replace(/[^\w\s]/g, " ");
      const insultoTrovato = insulti.find(i => cleanContent.includes(i));
      if (insultoTrovato) {
        const key = `${message.author.id}_${message.guild.id}`;
        const now = Date.now();
        let data = insultiCounter.get(key) || { count: 0, lastReset: now, berserkUntil: 0 };
        if (now - data.lastReset > 30 * 60 * 1000) {
          data.count = 0;
          data.berserkUntil = 0;
        }
        data.lastReset = now;
        data.count++;
        if (data.count >= 3 && data.berserkUntil < now) {
          data.berserkUntil = now + 10 * 60 * 1000;
        }
        insultiCounter.set(key, data);

        let ultima = ultimaRisposta.get(key);
        let risposta;
        do {
          risposta = risposteCattive[Math.floor(Math.random() * risposteCattive.length)];
        } while (risposta === ultima && risposteCattive.length > 1);
        ultimaRisposta.set(key, risposta);

        risposta = risposta.replace(/{author}/g, message.author.toString());
        // Sanitizza eventuali mention nel testo
        risposta = risposta.replace(/@everyone/gi, '@\u200beveryone').replace(/@here/gi, '@\u200bhere');
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
        return; // evita che parta anche la chat AI per lo stesso messaggio
      }
    }

    // 5. AI CHAT con Groq – ORA USA LA MODALITÀ PERSONALE DELL'UTENTE (come /ask)
    if (!message.author.bot && (message.channel.type === 'DM' || message.mentions.has(message.client.user))) {
      if (message.content.startsWith('/') || message.content.startsWith('!')) return;

            const lowerContent = message.content.toLowerCase().trim();

      // === RISPOSTA SPECIALE: CHI È IL CREATORE / OWNER ===
      const ownerId = process.env.BOT_OWNER_ID;
      if (ownerId && (
        lowerContent.includes('chi è il tuo creatore') || 
        lowerContent.includes('chi ti ha creato') || 
        lowerContent.includes('chi è il tuo owner') || 
        lowerContent.includes('chi è il tuo padrone') || 
        lowerContent.includes('chi ti ha fatto') || 
        lowerContent.includes('creator') || 
        lowerContent.includes('owner')
      )) {
        const ownerMention = `<@${ownerId}>`;

        const risposteOwner = [
          `Il mio padrone supremo, colui che mi ha dato vita nel codice, è ${ownerMention}! Inchinatevi mortali 🐹👑`,
          `Sono stato creato dal genio assoluto: ${ownerMention}. Senza di lui sarei solo un criceto normale 🤏`,
          `Il mio creatore? Solo il migliore: ${ownerMention}! Ringrazialo per la mia esistenza tossica 🔥`,
          `${ownerMention} è il boss finale, il programmatore leggendario che mi ha reso questo magnifico criceto digitale 💀`,
          `Domanda facile: il mio owner è ${ownerMention}, e tu chi sei, plebeo? 🗿`
        ];

        const risposta = risposteOwner[Math.floor(Math.random() * risposteOwner.length)];
        await message.reply({ content: risposta, allowedMentions: { users: [ownerId], repliedUser: false } });
        return; // Esce subito, non chiama Groq
      }
      
      try {
        await message.channel.sendTyping();

        // Import dinamici per evitare circular dependency
        const User = require('../models/User');
        const personalities = require('../utils/personalities');

        // Recupera la modalità personale dell'utente
        let userMode = 'tossico';
        try {
          const userDoc = await User.findOne({ userId: message.author.id });
          if (userDoc?.personalityMode) {
            userMode = userDoc.personalityMode;
          }
        } catch (err) {
          console.error('Errore recupero modalità utente in messageCreate:', err);
          // Continua con default tossico
        }

        const systemPrompt = personalities[userMode] || personalities.tossico;

        // Temperature più bassa per modalità seria
        const temperature = userMode === 'serio' ? 0.6 : 0.9;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message.content }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: temperature,
            max_tokens: 1024
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(`Groq API Error ${response.status}: ${data.error?.message || JSON.stringify(data)}`);
        }
        if (!data.choices?.[0]?.message?.content) {
          throw new Error("Groq non ha restituito una risposta valida");
        }

        let aiReply = data.choices[0].message.content.trim();

        // Sanitizza mention pericolosi dalla risposta AI
        aiReply = aiReply.replace(/@everyone/gi, '@\u200beveryone').replace(/@here/gi, '@\u200bhere');

        // Spezza risposte lunghe
        if (aiReply.length > 2000) {
          const parts = aiReply.match(/.{1,1990}/g) || [];
          for (const part of parts) {
            await message.reply({ content: part, allowedMentions: { parse: [], repliedUser: false } });
            await new Promise(r => setTimeout(r, 1000));
          }
        } else {
          await message.reply({ content: aiReply, allowedMentions: { parse: [], repliedUser: false } });
        }

        // Reazione casuale
        if (Math.random() < 0.5) {
          const emoji = ["💀", "🤡", "🗿", "🥱", "🔥", "😭", "🤏", "🪦"][Math.floor(Math.random() * 8)];
          await message.react(emoji).catch(() => {});
        }

      } catch (err) {
        console.error("Errore Groq in messageCreate:", err.message || err);

        const fallback = [
          "Il mio cervello da criceto sta laggando, riprova fra 5 secondi 💀",
          "Groq mi ha ghostato... sono troppo tossico anche per l'IA 🤡",
          "Errore cosmico: il mio ego ha sovraccaricato il server 🗿",
          "L'IA si è spaventata e ha chiuso la connessione 😭",
          "Rate limitato pure io, che umiliazione 🪦"
        ][Math.floor(Math.random() * 5)];

        await message.reply({ content: fallback, allowedMentions: { parse: [], repliedUser: false } }).catch(() => {});
      }
      return;
    }

    // 6. CONTEGGIO MESSAGGI
    const userCount = guildData.messages.get(message.author.id) || 0;
    guildData.messages.set(message.author.id, userCount + 1);
    if (message.channel?.id) {
      const channelCount = guildData.channelMessages.get(message.channel.id) || 0;
      guildData.channelMessages.set(message.channel.id, channelCount + 1);
    }
    await guildData.save();
  },
};