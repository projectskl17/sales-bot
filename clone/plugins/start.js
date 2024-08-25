const { addCommand, addCallback } = require('../events');
const Database = require('../../database/products');
const CloneDatabase = require('../../database/clone');
const { BOT_TOKEN } = require('../../config');
const db = new Database();
const cloneDb = new CloneDatabase();
const quantity = new Map();


addCommand('start', async (bot, chatId) => {
    const msg = 'Welcome to Your New Store Bot!\n' +
        '🎉 This bot was created using the Product Management Bot!\n' +
        '\n' +
        '🚀 Want to create your own store bot like this one?\n' +
        'Easily clone and manage your own store with Product Management Bot.\n' +
        '\n' +
        'Click the link below to get started and clone your bot: ' +
        '<a href="https://t.me/PROSELLER_ROBOT">Clone Your Bot Here 🤖</a>';

    bot.sendMessage(chatId, msg, {
        parse_mode: 'HTML'
    });

    const products = await db.getProducts(bot.token.split(':')[0]);

    if (products.length === 0) {
        bot.sendMessage(chatId, 'No products for sale');
        return;
    }

    const text = products.map(product => `- ${product.name}\nPrice: ${product.price}`).join('\n\n');

    const chunkArray = (arr, chunkSize) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += chunkSize) {
            chunks.push(arr.slice(i, i + chunkSize));
        }
        return chunks;
    };

    let buttonsPerRow = 2;
    if (products.length === 3) {
        buttonsPerRow = [2, 1];
    } else if (products.length % 3 === 0) {
        buttonsPerRow = 3;
    } else if (products.length % 2 !== 0) {
        buttonsPerRow = 2;
    }

    const inlineKeyboard = products.length === 3
        ? [
            products.slice(0, 2).map(product => ({ text: product.name, callback_data: `product:${product._id}` })),
            products.slice(2).map(product => ({ text: product.name, callback_data: `product:${product._id}` }))
        ]
        : chunkArray(
            products.map(product => ({ text: product.name, callback_data: `product:${product._id}` })),
            buttonsPerRow
        );

    bot.sendMessage(chatId, '<b>Products List</b>', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    });
});

addCallback('product', async (bot, query) => {
    const productId = query.data.split(':')[1];
    const product = await db.getProduct(bot.token.split(':')[0], productId);
    quantity.set(query.message.chat.id, 1);
    bot.sendMessage(query.message.chat.id, `Name: ${product.name}\nPrice: ${product.price}\n\n<b>${product.description}</b>\n\n<b>Order Quantity: ${quantity.get(query.message.chat.id)}</b>`, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '+1', callback_data: `add:${productId}` }, { text: '-1', callback_data: `remove:${productId}` }],
                [{ text: 'Confirm', callback_data: `confirm:${productId}` }]
            ]
        }
    });
    bot.answerCallbackQuery(query.id);
})

addCallback('add', async (bot, query) => {
    const productId = query.data.split(':')[1];
    const product = await db.getProduct(bot.token.split(':')[0], productId);
    quantity.set(query.message.chat.id, (quantity.get(query.message.chat.id) || 0) + 1);
    bot.editMessageText(`Name: ${product.name}\nPrice: ${product.price}\n\n<b>${product.description}</b>\n\n<b>Order Quantity: ${quantity.get(query.message.chat.id)}</b>`, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '+1', callback_data: `add:${productId}` }, { text: '-1', callback_data: `remove:${productId}` }],
                [{ text: 'Confirm', callback_data: `confirm:${productId}` }]
            ]
        }
    });
})

addCallback('remove', async (bot, query) => {
    const productId = query.data.split(':')[1];
    const product = await db.getProduct(bot.token.split(':')[0], productId);
    const currentQuantity = quantity.get(query.message.chat.id) || 0;
    if (currentQuantity > 1) {
        quantity.set(query.message.chat.id, currentQuantity - 1);
    } else {
        return bot.answerCallbackQuery(query.id, {
            text: 'Minimum quantity is 1',
            show_alert: true
        });
    }
    bot.editMessageText(`Name: ${product.name}\nPrice: ${product.price}\n\n<b>${product.description}</b>\n\n<b>Order Quantity: ${quantity.get(query.message.chat.id)}</b>`, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '+1', callback_data: `add:${productId}` }, { text: '-1', callback_data: `remove:${productId}` }],
                [{ text: 'Confirm', callback_data: `confirm:${productId}` }]
            ]
        }
    });
})

addCallback('confirm', async (bot, query) => {
    const productId = query.data.split(':')[1];
    const product = await db.getProduct(bot.token.split(':')[0], productId);
    const token = await cloneDb.getUserIdByToken(bot.token);
    const orderQuantity = quantity.get(query.message.chat.id);
    quantity.delete(query.message.chat.id);
    const finalPrice = String(product.price).replace(/\d+(?:\.\d+)?/, (match) => (parseFloat(match) * orderQuantity).toFixed(2));
    await bot.sendMessage(query.message.chat.id, `<b>Order Confirmed</b>\n\n${product.name}\nQuantity: ${orderQuantity}\nPrice: ${product.price}\nTotal: ${finalPrice}`, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Contact Seller', url: `tg://user?id=${token.userId}` }]
            ]
        }
    });
    bot.deleteMessage(query.message.chat.id, query.message.message_id);

    bot.answerCallbackQuery(query.id);

    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: token.userId,
            parse_mode: 'HTML',
            text: `<b>New Order Confirmed</b>\n\n${product.name}\nQuantity: ${orderQuantity}`,
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Contact Buyer', url: `tg://user?id=${query.message.chat.id}` }]
                ]
            }
        })
    })

    bot.answerCallbackQuery(query.id);
})