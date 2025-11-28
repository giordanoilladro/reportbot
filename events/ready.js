// events/ready.js
module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Bot loggato come ${client.user.tag}!`);
    client.user.setActivity('Report & Verify', { type: 'WATCHING' });

    const leaderboardCmd = require('../commands/leaderboard');
    await leaderboardCmd.startAllJobs(client);
    console.log('Leaderboard 22:00 caricata per tutti i server!');
  },
};