// deploy.js — Versione ULTIMATE Anti-Duplicati + Lista Server (Dicembre 2025) 🛡️🐹

require('dotenv').config();
const { REST, Routes, Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const seenNames = new Set();
const commandsPath = path.join(__dirname, 'commands');

console.log('🔍 Inizio scansione comandi...\n');

function loadCommands(dir) {
  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry); // ← FIXATO: era "fullPath" doppio!
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      loadCommands(fullPath);
    } else if (entry.endsWith('.js')) {
      try {
        delete require.cache[require.resolve(fullPath)];
        const command = require(fullPath);
        const relativePath = path.relative(commandsPath, fullPath);

        // SLASH COMMAND
        if (command.data?.name) {
          const name = command.data.name;
          if (seenNames.has(name)) {
            console.error(`❌ DUPLICATO BLOCCATO: /${name}`);
            console.error(`   Già caricato da un altro file!`);
            console.error(`   File in conflitto: ${relativePath}`);
            console.error(`   ➜ Rinomina o elimina uno dei due comandi.\n`);
            continue;
          }
          seenNames.add(name);
          commands.push(command.data.toJSON());
          console.log(`✅ Slash   /${name.padEnd(25)} ← ${relativePath}`);
        }

        // CONTEXT MENU COMMAND
        if (command.contextMenu?.name) {
          const name = command.contextMenu.name;
          if (seenNames.has(name)) {
            console.error(`❌ DUPLICATO BLOCCATO: "${name}" (context menu)`);
            console.error(`   Già presente!`);
            console.error(`   File in conflitto: ${relativePath}`);
            console.error(`   ➜ Cambia il nome del context menu.\n`);
            continue;
          }
          seenNames.add(name);
          commands.push(command.contextMenu.toJSON());
          console.log(`✅ Context "${name}"`.padEnd(35) + ` ← ${relativePath}`);
        }
      } catch (err) {
        console.error(`🚨 Errore caricamento ${entry}:`, err.message);
      }
    }
  }
}

loadCommands(commandsPath);

console.log(`\n📊 Totale comandi unici caricati: ${commands.length}`);
if (seenNames.size !== commands.length) {
  console.warn(`⚠️  Alcuni comandi duplicati sono stati bloccati!\n`);
}

// ====================================================================
// PARTE NUOVA: Mostra tutti i server in cui è presente il bot
// ====================================================================

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function showGuilds() {
  try {
    await client.login(process.env.TOKEN);
    await client.guilds.fetch(); // Forza fetch di tutte le guild

    console.log(`\n🤖 Il bot è presente in ${client.guilds.cache.size} server:\n`);
    console.log(`   Nome Server ${' '.repeat(40)} ID`);
    console.log(`   ${'-'.repeat(80)}`);

    // Ordina per numero membri (opzionale, per bellezza)
    const sortedGuilds = client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount);

    sortedGuilds.forEach(guild => {
      const name = guild.name.length > 45 ? guild.name.substring(0, 42) + '...' : guild.name;
      console.log(`   ${name.padEnd(48)} ${guild.id} (${guild.memberCount} membri)`);
    });

    console.log(`\n   ${'-'.repeat(80)}\n`);

  } catch (err) {
    console.error('❌ Errore nel login o recupero server:', err.message);
  } finally {
    client.destroy(); // Chiudi la connessione dopo aver preso i dati
  }
}

// ====================================================================
// Deploy dei comandi globali
// ====================================================================

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  // 1. Mostra i server
  await showGuilds();

  // 2. Deploy comandi
  if (commands.length === 0) {
    console.log('⚠️  Nessun comando da deployare. Esco.');
    return;
  }

  try {
    console.log(`🚀 Inizio deploy globale di ${commands.length} comandi su Discord...\n`);

    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log(`🎉 Deploy completato con successo!`);
    console.log(`   ${data.length} comandi registrati globalmente (tutti i server).\n`);

  } catch (error) {
    console.error('💥 Errore durante il deploy:\n');
    if (error.rawError?.errors) {
      console.error(JSON.stringify(error.rawError.errors, null, 2));
    } else {
      console.error(error.message || error);
    }
  }
})();