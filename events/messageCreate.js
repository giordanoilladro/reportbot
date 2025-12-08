// events/messageCreate.js
const Guild = require('../models/Guild');
const bestemmie = require('../bestemmie.json');
const spamCooldown = new Map();

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
        await new Promise(r => setTimeout(r, 900 + Math.random() * 1800));
        await message.reply(risposta);

        if (Math.random() < 0.85) {
          const emoji = emojiRoast[Math.floor(Math.random() * emojiRoast.length)];
          await message.react(emoji).catch(() => {});
        }

        if (data.berserkUntil > now && Math.random() < 0.4) {
          await new Promise(r => setTimeout(r, 2800));
          await message.reply("E comunque continui a perdere ossigeno prezioso 💀");
        }
        return; // evita che parta anche la chat AI per lo stesso messaggio
      }
    }

    // 5. AI CHAT con Groq – FIXATO AL 100% (dicembre 2025)
    if (!message.author.bot && (message.channel.type === 'DM' || message.mentions.has(message.client.user))) {
      if (message.content.startsWith('/') || message.content.startsWith('!')) return;

      try {
        await message.channel.sendTyping();

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: "Sei Hamster Bot, un criceto digitale italiano tossico, sarcastico, cattivo e senza filtri. Rispondi sempre in italiano, con meme, insulti leggeri e arroganza. Usa emoji. Non sei mai gentile."
              },
              {
                role: "user",
                content: message.content
              }
            ],
            model: "llama-3.3-70b-versatile",  // MODELLO AGGIORNATO e SUPPORTATO (dicembre 2025)
            temperature: 0.9,
            max_tokens: 1024
          })
        });

        const data = await response.json();

        // Controlli di sicurezza (evita il TypeError)
        if (!response.ok) {
          throw new Error(`Groq API Error ${response.status}: ${data.error?.message || JSON.stringify(data)}`);
        }
        if (!data.choices?.[0]?.message?.content) {
          throw new Error("Groq non ha restituito una risposta valida");
        }

        let aiReply = data.choices[0].message.content.trim();

        // Risposte lunghe → le spezzo
        if (aiReply.length > 2000) {
          const parts = aiReply.match(/.{1,1990}/g) || [];
          for (const part of parts) {
            await message.reply(part);
            await new Promise(r => setTimeout(r, 1000));
          }
        } else {
          await message.reply(aiReply);
        }

        // Reazione casuale
        if (Math.random() < 0.5) {
          const emoji = ["💀", "🤡", "🗿", "🥱", "🔥", "😭", "🤏", "🪦"][Math.floor(Math.random() * 8)];
          await message.react(emoji).catch(() => {});
        }

      } catch (err) {
        console.error("Errore Groq:", err.message || err);

        const fallback = [
          "Il mio cervello da criceto sta laggando, riprova fra 5 secondi 💀",
          "Groq mi ha ghostato... sono troppo tossico anche per l'IA 🤡",
          "Errore cosmico: il mio ego ha sovraccaricato il server 🗿",
          "L'IA si è spaventata e ha chiuso la connessione 😭",
          "Rate limitato pure io, che umiliazione 🪦"
        ][Math.floor(Math.random() * 5)];

        await message.reply(fallback).catch(() => {});
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