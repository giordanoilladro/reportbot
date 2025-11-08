const bestemmie = require('../bestemmie.json');

module.exports = {
  name: 'messageCreate',
  execute(message, client) {
    if (message.author.bot) return;
    const content = message.content.toLowerCase();
    if (bestemmie.some(b => content.includes(b.toLowerCase()))) {
      message.delete();
      message.channel.send(`${message.author}, bestemmie non permesse!`);
    }
  },
};