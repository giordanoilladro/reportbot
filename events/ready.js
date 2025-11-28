// events/ready.js (o dove lo hai tu)
module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {  // ← aggiungi async qui
    console.log(`Bot loggato come ${client.user.tag}!`);
    client.user.setActivity('Report & Verify', { type: 'WATCHING' });

    // AVVIO AUTOMATICO LEADERBOARD GIORNALIERA
    try {
      const leaderboardCmd = require('../commands/leaderboard'); // percorso corretto se sei in events/
      await leaderboardCmd.startAllJobs(client);
      console.log('Leaderboard giornaliera (22:00) caricata per tutti i server attivi!');
    } catch (err) {
      console.log('Nessuna leaderboard attiva o errore caricamento:', err.message);
    }
  },
};