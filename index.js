const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { BOT_TOKEN, MONGO_URI, PORT } = require('./config');
const { plugins } = require('./events');
require('./database/database');
const { BotManager } = require('./clone/');
const { getBotInfo, startBot } = require('./lib/utils');
const Database = require('./database/clone');

const db = new Database();

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const buttonCache = new Map();

function setCache(key, text, opts) {
    buttonCache.set(key, { text, opts });
}
global.setCache = setCache;

function getCache(key) {
    return buttonCache.get(key) || { text: '', opts: {} };
}
global.getCache = getCache;

const pluginsFolder = path.join(__dirname, 'plugins');

function initializePlugins() {
  fs.readdirSync(pluginsFolder).forEach(file => {
    if (file.endsWith('.js')) {
      const pluginPath = path.join(pluginsFolder, file);
      require(pluginPath);
    }
  });

  Object.keys(plugins.commands).forEach(commandName => {
    bot.onText(new RegExp(`^/${commandName}`), (msg) => {
      const chatId = msg.chat.id;
      plugins.commands[commandName](bot, chatId, msg);
    });
  });

  bot.on('callback_query', (query) => {
    const action = query.data.split(':')[0];
    if (plugins.callbacks[action]) {
      plugins.callbacks[action](bot, query);
    }
  });
}

async function initializeCloneBots() {
  const tokens = await db.getTokens();
  const botManager = new BotManager();
  global.botManager = botManager;
  botManager.startServer(PORT);
  tokens.forEach(token => {
    startBot(token.token, botManager).then(botInfo => {
      console.log(`Bot ${botInfo.info.first_name} is running...`);
    }).catch(err => {
      db.deleteToken(token);
      console.error(err);
    });
  });
}

initializePlugins();
initializeCloneBots();

bot.on('polling_error', (error) => {
  console.error(error);
});

console.log('Bot is running...');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});