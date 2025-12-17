const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const VIP_ROLE_ID = '1413894001312006316'; // Il tuo ID ruolo VIP

const BOOSTS = {
  diamond: { emoji: '💎', color: 0x00FFFF, name: 'Diamond Glow' },
  fire: { emoji: '🔥', color: 0xFF4500, name: 'Fire Aura' },
  crown: { emoji: '👑', color: 0xFFD700, name: 'Royal Crown' },
  star: { emoji: '⭐', color: 0xFFAA00, name: 'Star Shine' },
  neon: { emoji: '⚡', color: 0x00FF00, name: 'Neon Thunder' },
  galaxy: { emoji: '🌌', color: 0x9400D3, name: 'Galaxy Void' },
  ice: { emoji: '❄️', color: 0x00FFFF, name: 'Ice King' },
  rainbow: { emoji: '🌈', color: 0xFF69B4, name: 'Rainbow Pride' }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vip-boost')
    .setDescription('Attiva un boost VIP esclusivo per 20 minuti! ✨')
    .addStringOption(option =>
      option
        .setName('tipo')
        .setDescription('Scegli il tuo stile di boost leggendario')
        .setRequired(true)
        .addChoices(
          { name: '💎 Diamond Glow (ciano cristallino)', value: 'diamond' },
          { name: '🔥 Fire Aura (rosso infuocato)', value: 'fire' },
          { name: '👑 Royal Crown (oro regale)', value: 'crown' },
          { name: '⭐ Star Shine (arancione stellare)', value: 'star' },
          { name: '⚡ Neon Thunder (verde elettrico)', value: 'neon' },
          { name: '🌌 Galaxy Void (viola cosmico)', value: 'galaxy' },
          { name: '❄️ Ice King (azzurro ghiaccio)', value: 'ice' },
          { name: '🌈 Rainbow Pride (arcobaleno magico)', value: 'rainbow' }
        )
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(VIP_ROLE_ID)) {
      return interaction.reply({
        content: '❌ Questo potere è riservato solo ai veri VIP! 💎',
        flags: MessageFlags.Ephemeral
      });
    }

    const type = interaction.options.getString('tipo');
    const boost = BOOSTS[type];

    // Rimuovi TUTTE le emoji boost possibili dal nick attuale
    let cleanNick = interaction.member.displayName
      .replace(/^💎\s*/, '')
      .replace(/^🔥\s*/, '')
      .replace(/^👑\s*/, '')
      .replace(/^⭐\s*/, '')
      .replace(/^⚡\s*/, '')
      .replace(/^🌌\s*/, '')
      .replace(/^❄️\s*/, '')
      .replace(/^🌈\s*/, '')
      .trim();

    const boostedNick = `${boost.emoji} ${cleanNick}`;

    try {
      await interaction.member.setNickname(boostedNick);

      const embed = new EmbedBuilder()
        .setColor(boost.color)
        .setTitle(`${boost.emoji} BOOST VIP ATTIVATO ${boost.emoji}`)
        .setDescription(
          `**${interaction.user.username}** ha sbloccato il potere del **${boost.name}**!\n\n` +
          `✨ Il tuo nome ora brilla con un'aura leggendaria\n` +
          `⏰ Durata: **20 minuti**\n` +
          `🔥 Goditi l'attenzione che meriti, VIP!`
        )
        .addFields(
          { name: 'Stile attivato', value: `${boost.emoji} **${boost.name}**`, inline: true },
          { name: 'Tempo rimanente', value: '`20:00`', inline: true }
        )
        .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Esclusivo per membri VIP • Hamster Bot Premium', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

      // Rimozione automatica dopo 20 minuti
      setTimeout(async () => {
        try {
          await interaction.member.setNickname(cleanNick || null);
        } catch (error) {
          console.log(`Errore rimozione boost per ${interaction.user.tag}:`, error);
        }
      }, 20 * 60 * 1000);

    } catch (error) {
      await interaction.reply({
        content: '❌ Errore: Non ho i permessi per modificare il tuo nickname!\nContatta uno staff per fixare i permessi del bot.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};