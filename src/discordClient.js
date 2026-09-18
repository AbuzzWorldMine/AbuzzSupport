const { Client, GatewayIntentBits, Partials } = require('discord.js');

// Привилегированные intents (Server Members / Message Content) не нужны:
// бот работает через кнопки и модальные окна, а не через чтение сообщений.
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

module.exports = client;
