require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// Funzione ricorsiva per caricare comandi da tutte le sottocartelle
function loadCommands(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      loadCommands(fullPath); // Ricorsione nelle sottocartelle
    } else if (file.endsWith('.js')) {
      try {
        const command = require(fullPath);
        if (command.data && command.data.name) {
          commands.push(command.data.toJSON());
          console.log(`Caricato comando: /${command.data.name}`);
        }
      } catch (err) {
        console.error(`Errore caricamento ${file}:`, err.message);
      }
    }
  }
}

loadCommands(commandsPath);

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Inizio deploy dei comandi...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log(`Comandi deployati con successo: ${commands.length} comandi`);
  } catch (error) {
    console.error('Errore deploy:', error);
  }
})();