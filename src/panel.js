const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { loadConfig, saveConfig } = require('./configStore');

const BUTTON_STYLES = {
  Primary: ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success: ButtonStyle.Success,
  Danger: ButtonStyle.Danger,
};

function buildPanel(config) {
  const embed = new EmbedBuilder()
    .setTitle(config.embed?.title || 'Поддержка')
    .setDescription(config.embed?.description || '')
    .setColor(config.embed?.color || '#5865F2');

  if (config.embed?.footer) embed.setFooter({ text: config.embed.footer });

  const button = new ButtonBuilder()
    .setCustomId('create_ticket')
    .setLabel(config.button?.label || 'Создать тикет')
    .setStyle(BUTTON_STYLES[config.button?.style] || ButtonStyle.Primary);

  if (config.button?.emoji) button.setEmoji(config.button.emoji);

  const row = new ActionRowBuilder().addComponents(button);

  return { embeds: [embed], components: [row] };
}

// Отправляет панель (или редактирует уже существующую, чтобы не плодить дубликаты)
async function syncPanel(client) {
  const config = loadConfig();
  if (!config.panelChannelId) {
    return { ok: false, error: 'Канал для панели не выбран' };
  }

  const channel = await client.channels.fetch(config.panelChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return { ok: false, error: 'Канал для панели не найден или не текстовый' };
  }

  const payload = buildPanel(config);

  if (config.panelMessageId) {
    const existing = await channel.messages.fetch(config.panelMessageId).catch(() => null);
    if (existing) {
      await existing.edit(payload);
      return { ok: true };
    }
  }

  const sent = await channel.send(payload);
  config.panelMessageId = sent.id;
  saveConfig(config);
  return { ok: true };
}

module.exports = { buildPanel, syncPanel, BUTTON_STYLES };
