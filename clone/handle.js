const { plugins } = require('./events');

class BotHandler {
    constructor(bot) {
        this.bot = bot;
    }

    initializeCommands() {
        Object.keys(plugins.commands).forEach(commandName => {
            this.bot.onText(new RegExp(`^/${commandName}`), (msg) => {
                const chatId = msg.chat.id;
                plugins.commands[commandName](this.bot, chatId, msg);
            });
        });
    }

    initializeEvents() {
        Object.keys(plugins.events).forEach(eventName => {
            this.bot.on(eventName, (event) => {
                plugins.events[eventName](this.bot, event);
            });
        });
    }

    initializeCallbacks() {
        this.bot.on('callback_query', (query) => {
            const action = query.data.split(':')[0];
            if (plugins.callbacks[action]) {
                plugins.callbacks[action](this.bot, query);
            }
        });
    }

    initialize() {
        this.initializeCommands();
        this.initializeCallbacks();
    }
}

module.exports = BotHandler;
