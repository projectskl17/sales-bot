const TelegramBot = require('node-telegram-bot-api');
const BotHandler = require('./handle');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const https = require('https');

const privateKey = fs.readFileSync('/etc/letsencrypt/live/probot.ddns.net/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/probot.ddns.net/fullchain.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const pluginsFolder = path.join(__dirname, 'plugins');
fs.readdirSync(pluginsFolder).forEach(file => {
  if (file.endsWith('.js')) {
    const pluginPath = path.join(pluginsFolder, file);
    require(pluginPath);
  }
});

class CloneBot {
  constructor(token, webhookUrl) {
    this.token = token;
    this.webhookUrl = webhookUrl;
    this.bot = new TelegramBot(token);
  }

  async initialize() {
    await this.bot.setWebHook(`${this.webhookUrl}/bot${this.token}`);
    global.bots = global.bots || {};
    global.bots[this.token] = this;
    new BotHandler(this.bot).initialize();
  }

  handleUpdate(update) {
    this.bot.processUpdate(update);
  }

  sendMessage(chatId, text) {
    return this.bot.sendMessage(chatId, text);
  }
}

class BotManager {
  constructor() {
    this.app = express();
    this.app.use(bodyParser.json());
    this.server = null;
    this.bots = {};
  }

  addBot(token, webhookUrl) {
    const bot = new CloneBot(token, webhookUrl);
    bot.initialize();

    this.app.post(`/bot${token}`, (req, res) => {
      bot.handleUpdate(req.body);
      res.sendStatus(200);
    });

    if (this.server) {
      this.server._router = this.app._router;
    }

    this.bots[token] = bot;

    return bot;
  }

  stopBot(token) {
    const bot = this.bots[token];
    if (bot) {
      delete this.bots[token];
      bot.bot.deleteWebHook();
    }
  }

  startServer(port) {
    this.server = https.createServer(credentials, this.app).listen(port, () => {
      console.log(`Webhook server is listening on port ${port}`);
    });
  }

  addBotAfterServerStart(token, webhookUrl) {
    if (!this.server) {
      throw new Error("Server hasn't been started yet. Call startServer first.");
    }
    return this.addBot(token, webhookUrl);
  }
}

module.exports = { CloneBot, BotManager };
