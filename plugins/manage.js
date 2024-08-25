const { addCommand, addCallback } = require('../events');
const Database = require('../database/products');
const CloneDatabase = require('../database/clone');
const db = new Database();
const cloneDb = new CloneDatabase();

let userProducts = new Map();

addCallback('addproduct', async (bot, query) => {
    const chatId = query.message.chat.id;
    userProducts.set(chatId, {});
    bot.sendMessage(chatId, 'Enter the product name:', { reply_markup: { force_reply: true } }).then((sent) => {
        bot.onReplyToMessage(sent.chat.id, sent.message_id, async (reply) => {
            let product = userProducts.get(chatId);
            product.name = reply.text;
            userProducts.set(chatId, product);

            await bot.sendMessage(sent.chat.id, 'Enter the product price:', { reply_markup: { force_reply: true } }).then((sent) => {
                bot.onReplyToMessage(sent.chat.id, sent.message_id, async (reply) => {
                    product = userProducts.get(chatId);
                    product.price = reply.text;
                    userProducts.set(chatId, product);

                    await bot.sendMessage(sent.chat.id, 'Enter the description:', { reply_markup: { force_reply: true } }).then((sent) => {
                        bot.onReplyToMessage(sent.chat.id, sent.message_id, async (reply) => {
                            product = userProducts.get(chatId);
                            product.description = reply.text;

                            const token = await cloneDb.getTokenByUserId(sent.chat.id);
                            const res = await db.addProduct(token.token.split(':')[0], product.name, product.price, product.description);

                            if (!res) {
                                return bot.sendMessage(sent.chat.id, 'Product already exists with that name');
                            }

                            userProducts.delete(chatId);
                            await bot.sendMessage(sent.chat.id, `Product added successfully!\n\nName: ${product.name}\nPrice: ${product.price}\nDescription: ${product.description}`, {
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: 'Add Products', callback_data: 'addproduct' }],
                                        [{ text: 'Delete Products', callback_data: 'deleteproduct' }]
                                    ]
                                }
                            });
                            bot.deleteMessage(sent.chat.id, sent.message_id);
                        });
                    });
                });
            });
            bot.deleteMessage(sent.chat.id, sent.message_id);
        });
    });
});

addCallback('deleteproduct', async (bot, query) => {
    const chatId = query.message.chat.id;

    const token = await cloneDb.getTokenByUserId(chatId);
    const products = await db.getProducts(token.token.split(':')[0]);

    if (products.length === 0) {
        return bot.sendMessage(chatId, 'No products found');
    }

    const keyboard = products.map((product) => {
        return [{ text: product.name, callback_data: `delete:${product._id}:${product.name}` }];
    });

    keyboard.push([{ text: '[ Cancel ]', callback_data: 'cancel' }]);

    await bot.sendMessage(chatId, 'Select a product to delete:', {
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
});

addCommand('clear', async (bot, chatId) => {

    const token = await cloneDb.getTokenByUserId(chatId);
    const products = await db.getProducts(token.token.split(':')[0]);

    if (products.length === 0) {
        return bot.sendMessage(chatId, 'No products found');
    }

    const res = await db.clear(token.token.split(':')[0]);

    if (!res) {
        return bot.sendMessage(chatId, 'Products could not be deleted');
    }

    bot.sendMessage(chatId, 'All products deleted successfully');
});

addCallback('delete', async (bot, query, match) => {
    const chatId = query.message.chat.id;
    const [, productId, productName] = query.data.split(':');

    const token = await cloneDb.getTokenByUserId(chatId);
    const res = await db.deleteProduct(token.token.split(':')[0], productId);

    if (!res) {
        return bot.answerCallbackQuery(query.id, 'Product could not be deleted');
    }

    const currentKeyboard = query.message.reply_markup.inline_keyboard;

    const updatedKeyboard = currentKeyboard.filter(row =>
        row[0].callback_data !== query.data
    );

    const updatedText = `${query.message.text}\n\nDeleted: ${productName}`;

    await bot.editMessageText(updatedText, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
            inline_keyboard: updatedKeyboard
        }
    });
});

addCallback('viewproduct', async (bot, query) => {
    const chatId = query.message.chat.id;

    const token = await cloneDb.getTokenByUserId(chatId);
    const products = await db.getProducts(token.token.split(':')[0]);

    if (products.length === 0) {
        return bot.sendMessage(chatId, 'No products found');
    }

    const text = products.map(product => {
        return `Name: ${product.name}\nPrice: ${product.price}\nDescription: ${product.description}\n`;
    }).join('\n');

    const keyboard = [
        [{ text: 'Add Product', callback_data: 'addproduct' }, { text: 'Delete Product', callback_data: 'deleteproduct' }],
        [{ text: 'Back', callback_data: 'back' }],
    ];

    await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
});