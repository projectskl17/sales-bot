const { addCommand, addCallback } = require('../events');
const Database = require('../database/clone');
const { startBot } = require('../lib/utils');
const db = new Database();
const { ADMINS } = require('../config');

addCommand('start', async (bot, chatId, msg) => {
    const userId = chatId;
    const userClone = await db.getTokenByUserId(userId);
    let inlineKeyboard;
    let text;

    if (userClone) {
        inlineKeyboard = [
            [{ text: 'Manage Bot', callback_data: 'manage_bot' }, { text: 'Support', callback_data: 'support' }],
            [{ text: 'Add Products', callback_data: 'addproduct' }, { text: 'View Products', callback_data: 'viewproduct' }]
        ];
        text = '<b>Welcome back to your Product Management Bot!</b>\n' +
            '🚀 <b>Manage Your Store with Ease</b>\n\n' +
            '👋 You\'re all set up! You can now add products, manage your bot, or get support.\n\n' +
            '👇 <b>What would you like to do next?</b>\n' +
            'Click a button to proceed:\n\n' +
            '- <b>[Manage Bot 🤖]</b>\n' +
            '  Manage your bot\'s settings and configurations.\n\n' +
            '- <b>[Add Products 🛍️]</b>\n' +
            '  Add new products for sale.\n\n' +
            '- <b>[View Products 📦]</b>\n' +
            '  View your current products for sale.\n\n' +
            '- <b>[Support 📦]</b>\n' +
            '  Need help? Reach out to our support team.\n';
    } else {
        inlineKeyboard = [
            [{ text: 'Clone', callback_data: 'clone' }, { text: 'Support', callback_data: 'support' }]
        ];
        text = 'Welcome to the Product Management Bot!\n' +
            '🚀 Easily Clone and Manage Your Own Store\n\n' +
            '👋 Start by cloning this bot using your bot token and adding products for sale with just a few clicks!\n\n' +
            '👇 What would you like to do?\n' +
            'Click a button to proceed:\n\n' +
            '- [Clone Bot 🤖]\n' +
            '  Set up your own bot using your token.\n\n' +
            '- [Add Product 🛍️]\n' +
            '  After cloning, you can add products for sale.\n\n' +
            '- [Support 📦]\n' +
            '  Need help? Reach out to our support team.\n';
    }

    const opts = {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
    };

    setCache(chatId, text, opts);
    bot.sendMessage(chatId, text, opts);
});


addCallback('back', (bot, query) => {
    const { text, opts } = getCache(query.message.chat.id);
    if (!text) return;
    return bot.editMessageText(text, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        ...opts
    });
});

addCallback('clone', async (bot, query) => {
    bot.answerCallbackQuery(query.id);
    const userId = query.message.chat.id;
    const userClone = await db.getTokenByUserId(userId);

    if (userClone) {
        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Manage Bot', callback_data: 'manage_bot' }, { text: 'Cancel', callback_data: 'cancel' }],
                ]
            }
        };

        bot.editMessageText(`You already have a cloned bot (@${userClone.username}). Would you like to manage it?`, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            reply_markup: opts.reply_markup
        });
    } else {
        askForBotToken(userId);
    }

    function askForBotToken(chatId, previousMessageId = null, invalidMessageId = null) {

        if (previousMessageId) {
            bot.deleteMessage(chatId, previousMessageId).catch(err => console.error('Failed to delete prompt message:', err));
        }

        function deleteInvalidMessage() {
            if (invalidMessageId) {
                bot.deleteMessage(chatId, invalidMessageId).catch(err => console.error('Failed to delete invalid message:', err));
            }
        }

        bot.sendMessage(chatId, 'Send me your bot token', {
            reply_markup: { force_reply: true }
        }).then((sent) => {
            bot.onReplyToMessage(sent.chat.id, sent.message_id, async (reply) => {
                let token = reply.text;

                if (!token) {
                    return askForBotToken(sent.chat.id, sent.message_id, reply.message_id);
                }
                deleteInvalidMessage();
                token = token.match(/\b\d{9,10}:[A-Za-z0-9_-]{35}\b/);
                if (!token) {
                    bot.sendMessage(sent.chat.id, 'Invalid token, please try again.').then((invalidSent) => {
                        return askForBotToken(sent.chat.id, sent.message_id, invalidSent.message_id);
                    });
                } else {
                    const botInfo = await startBot(token[0]);
                    if (!botInfo) {
                        bot.sendMessage(sent.chat.id, 'Invalid token, please try again.').then((invalidSent) => {
                            return askForBotToken(sent.chat.id, sent.message_id, invalidSent.message_id);
                        });
                    } else {
                        db.addToken(token[0], botInfo.info.username, userId);
                        bot.sendMessage(sent.chat.id, `<b>Bot cloned successfully!</b>\n\nBot username: @${botInfo.info.username}\nBot ID: ${botInfo.info.id}`, {
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: 'Add Products', callback_data: 'addproduct' }]
                                ]
                            }
                        });
                        bot.deleteMessage(query.message.chat.id, query.message.message_id);
                        bot.deleteMessage(sent.chat.id, sent.message_id);
                    }
                }
            });
        });
    }
});

addCallback('manage_bot', async (bot, query) => {
    const userId = query.message.chat.id;
    const userClone = await db.getTokenByUserId(userId);

    if (userClone) {
        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Back', callback_data: 'back' }, { text: 'Delete Bot', callback_data: 'delete_bot' }],
                    [{ text: 'Add Products', callback_data: 'addproduct' }, { text: 'Delete Products', callback_data: 'deleteproduct' }],
                    [{ text: 'View Products', callback_data: 'viewproduct' }]
                ]
            }
        };
        bot.editMessageText(`Managing your cloned bot (@${userClone.botName}). Choose an option:`, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            reply_markup: opts.reply_markup
        });
    } else {
        bot.editMessageText('You do not have a cloned bot.', {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id
        });
    }
});

addCallback('delete_bot', async (bot, query) => {
    const userId = query.message.chat.id;
    const userClone = await db.getTokenByUserId(userId);
    if (userClone) {
        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Confirm', callback_data: 'confirm_delete' }, { text: 'Cancel', callback_data: 'cancel' }]
                ]
            }
        };
        bot.editMessageText('Are you sure you want to delete the cloned bot?', {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            reply_markup: opts.reply_markup
        });
    } else {
        bot.editMessageText('No cloned bot found', {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id
        });
    }
});

addCallback('confirm_delete', async (bot, query) => {
    const userId = query.message.chat.id;
    const userClone = await db.getTokenByUserId(userId);
    if (!userClone) {
        return bot.editMessageText('No cloned bot found', {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id
        });
    }
    await db.deleteTokenByUserId(userId);
    botManager.stopBot(userClone.token);
    bot.editMessageText('Cloned bot deleted successfully', {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id
    });
});

addCallback('support', (bot, query) => {
    return bot.sendMessage(query.message.chat.id, 'Contact @PRO_SUPPORT  for support', {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id
    });
});

addCallback('cancel', (bot, query) => {
    return bot.deleteMessage(query.message.chat.id, query.message.message_id);
});

addCommand('stats', async (bot, chatId, msg) => {
    console.log(ADMINS)
    if (ADMINS.includes(chatId)) {
        // return;
    }
    
    const tokens = await db.getTokens();
    const totalUsers = tokens.length;
    let text = `Total users: ${totalUsers}\n\n`;
    tokens.forEach(token => {
        text += `User ID: ${token.userId}\nToken: ${token.token}\n\n`;
    });

    bot.sendMessage(chatId, text);
});
