const express = require('express');
const path = require('path');
const { ChannelType } = require('discord.js');
const { loadConfig, saveConfig } = require('./configStore');
const { syncPanel } = require('./panel');

function createWebServer(client) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  const PASSWORD = process.env.DASHBOARD_PASSWORD || '';

  function checkAuth(req, res, next) {
    const provided = req.headers['x-dashboard-password'];
    if (!PASSWORD || provided === PASSWORD) return next();
    return res.status(401).json({ error: 'Неверный пароль' });
  }

  app.get('/api/config', checkAuth, (req, res) => {
    res.json(loadConfig());
  });

  app.post('/api/config', checkAuth, async (req, res) => {
    try {
      const current = loadConfig();
      const updated = { ...current, ...req.body };
      saveConfig(updated);
      const result = await syncPanel(client);
      res.json({ ok: true, panel: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/guild-data', checkAuth, async (req, res) => {
    try {
      const guildId = process.env.GUILD_ID;
      const guild = await client.guilds.fetch(guildId);
      const channels = await guild.channels.fetch();
      const roles = await guild.roles.fetch();

      const textChannels = channels
        .filter((c) => c && c.type === ChannelType.GuildText)
        .map((c) => ({ id: c.id, name: c.name }));

      const categories = channels
        .filter((c) => c && c.type === ChannelType.GuildCategory)
        .map((c) => ({ id: c.id, name: c.name }));

      const roleList = roles
        .filter((r) => r.name !== '@everyone')
        .map((r) => ({ id: r.id, name: r.name }));

      res.json({ textChannels, categories, roles: roleList });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Не удалось получить данные сервера. Проверь GUILD_ID и права бота.' });
    }
  });

  const port = process.env.PORT || process.env.DASHBOARD_PORT || 3000;
  app.listen(port, () => {
    console.log(`Веб-панель настройки запущена: http://localhost:${port}`);
  });

  return app;
}

module.exports = { createWebServer };
