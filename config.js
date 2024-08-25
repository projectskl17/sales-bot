const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env', override: true });

module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN || '',
    MONGO_URI_TOKENS: process.env.MONGO_URI_TOKENS || '',
    MONGO_URI_PRODUCTS: process.env.MONGO_URI_PRODUCTS || '',
    DOMAIN: process.env.DOMAIN || '',
    PORT: process.env.PORT || 3000,
    ADMINS: process.env.ADMINS ? process.env.ADMINS.split(',') : [],
};
