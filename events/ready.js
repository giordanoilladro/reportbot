module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`Bot loggato come ${client.user.tag}!`);
    client.user.setActivity('Report & Verify', { type: 'WATCHING' });
  },
};