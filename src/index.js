require('dotenv').config();
const client = require('./discordClient');
const { registerTicketHandlers } = require('./ticketHandler');
const { createWebServer } = require('./webServer');
const { syncPanel } = require('./panel');

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN не задан в .env файле!');
  process.exit(1);
}

registerTicketHandlers(client);

client.once('ready', async () => {
  console.log(`Бот запущен как ${client.user.tag}`);
  createWebServer(client);

  const result = await syncPanel(client);
  if (!result.ok) {
    console.log('Панель ещё не отправлена:', result.error, '— настрой канал через веб-панель.');
  }
});

client.login(process.env.DISCORD_TOKEN);
