// commands/fun/daily.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Riscuoti il tuo premio giornaliero! (con streak!)'),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    let guildData = await Guild.findOne({ guildId });
    if (!guildData) guildData = new Guild({ guildId });

    if (!guildData.daily) guildData.daily = new Map();
    if (!guildData.dailyStreak) guildData.dailyStreak = new Map();
    if (!guildData.dailyLast) guildData.dailyLast = new Map();

    const today = new Date().toDateString();
    const lastClaim = guildData.dailyLast.get(userId);
    const streak = guildData.dailyStreak.get(userId) || 0;

    let reward = 100;
    let newStreak = streak;
    let message = '';
    let color = '#00ff00';
    let thumbnail = 'https://cdn.discordapp.com/emojis/1279541430090928169.png'; // Icona soldi Discord

    // Già riscattato oggi
    if (lastClaim === today) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Hai già riscattato il daily oggi!')
        .setDescription(`Torna domani per mantenere lo streak!\nStreak attuale: **${streak} giorno${streak === 1 ? '' : 'i'} consecutivi**`)
        .addFields(
          { name: 'Prossimo daily', value: `<t:${Math.floor((Date.now() + 24*60*60*1000)/1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'Mantieni lo streak quotidiano per bonus extra!' })
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (lastClaim === yesterdayStr) {
      // Streak continua!
      newStreak = streak + 1;
      reward += newStreak * 30; // Bonus streak migliorato
      message = `🔥 Streak di **${newStreak} giorno${newStreak === 1 ? '' : 'i'}** consecutivi! Bonus extra attivato!`;
      color = '#00ff00';
    } else if (lastClaim) {
      // Streak perso
      newStreak = 1;
      message = '😔 Streak perso per non aver riscattato ieri... Ricominciamo da 1 con energia!';
      color = '#ffaa00';
    } else {
      // Primo daily
      newStreak = 1;
      message = '🎉 Primo daily! Benvenuto nel mondo dei premi quotidiani!';
      color = '#5865F2';
    }

    guildData.daily.set(userId, (guildData.daily.get(userId) || 0) + reward);
    guildData.dailyStreak.set(userId, newStreak);
    guildData.dailyLast.set(userId, today);
    await guildData.save();

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL({ size: 256 })
      })
      .setTitle(`${message}`)
      .setDescription(`Hai ricevuto **${reward.toLocaleString()}** crediti! 💰`)
.addFields(
        { name: 'Streak attuale', value: `Fire **${newStreak}** giorno${newStreak === 1 ? '' : 'i'}`, inline: true },
        { name: 'Totale crediti daily', value: `Gem **${guildData.daily.get(userId).toLocaleString()}**`, inline: true },
        { name: 'Prossimo daily', value: `Clock <t:${Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000)}:R>`, inline: false }
      )
      .setFooter({ text: 'Più giorni consecutivi = più crediti!' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};