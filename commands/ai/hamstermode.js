// commands/ai/hamstermode.js
const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User'); // ajusta il path se necessario

const MODES = {
  tossico: '😈 Tossico (default: arrogante, sarcastico, mafioso)',
  scherzoso: '😂 Scherzoso (divertente, giocoso, amichevole)',
  serio: '📘 Serio (preciso, fattuale, senza scherzi o invenzioni)',
  arrabbiato: '🤬 Arrabbiato (urla, insulti pesanti, sempre incazzato)',
  dissing: '🔥 Dissing (roast epici, barre da rap, umiliazioni totali)',
  carino: '🥰 Carino (dolce, gentile, affettuoso e premuroso)'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hamstermode')
    .setDescription('Gestisci come Hamster Bot ti parla personalmente')
    .addSubcommand(sub =>
      sub
        .setName('imposta')
        .setDescription('Cambia la tua modalità preferita')
        .addStringOption(option =>
          option
            .setName('modalita')
            .setDescription('Scegli la personalità del bot per te')
            .setRequired(true)
            .addChoices(
              { name: '😈 Tossico (default)', value: 'tossico' },
              { name: '😂 Scherzoso', value: 'scherzoso' },
              { name: '📘 Serio', value: 'serio' },
              { name: '🤬 Arrabbiato', value: 'arrabbiato' },
              { name: '🔥 Dissing pesante', value: 'dissing' },
              { name: '🥰 Carino', value: 'carino' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Mostra la tua modalità attuale del bot')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (subcommand === 'imposta') {
      const mode = interaction.options.getString('modalita');

      let user = await User.findOne({ userId });
      if (!user) {
        user = new User({ userId, personalityMode: mode });
      } else {
        user.personalityMode = mode;
      }
      await user.save();

      await interaction.reply({
        content: `✅ Modalità aggiornata! Da ora in poi ti parlerò in stile **${MODES[mode]}** 🐹`,
        ephemeral: true
      });
    }

    else if (subcommand === 'info') {
      let user = await User.findOne({ userId });
      const currentMode = user?.personalityMode || 'tossico';

      const modeDescription = MODES[currentMode] || MODES.tossico;

      await interaction.reply({
        content: `🐹 **La tua modalità attuale è:**\n**${modeDescription}**\n\nPuoi cambiarla con \`/hamstermode imposta\``,
        ephemeral: true
      });
    }
  },
};