# Discord Support Bot

Discord-бот тикет-поддержки с веб-панелью настройки.

## Установка

```bash
npm install
cp .env.example .env
```

Заполни `.env` своими данными:

```
DISCORD_TOKEN=токен_бота
GUILD_ID=id_сервера
DASHBOARD_PORT=3000
DASHBOARD_PASSWORD=надёжный_пароль
```

## Запуск

```bash
npm start
```

Веб-панель настройки будет доступна на `http://<хост>:<DASHBOARD_PORT>`.

## ⚠️ Безопасность

- Никогда не коммить `.env` в git — он уже в `.gitignore`.
- Если токен бота когда-либо попадал в открытый репозиторий или чат — сразу сгенерируй новый токен в [Discord Developer Portal](https://discord.com/developers/applications) (Bot → Reset Token).
