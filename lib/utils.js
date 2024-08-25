const https = require('https');
const { DOMAIN } = require('../config');

function getBotInfo(token) {
    return new Promise((resolve, reject) => {
        https.get(`https://api.telegram.org/bot${token}/getMe`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.ok) {
                        resolve(result.result);
                    } else {
                        reject(new Error('Invalid token'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (e) => reject(e));
    });
}

function startBot(token, botManager = global.botManager) {
    return new Promise((resolve, reject) => {
        getBotInfo(token)
            .then(info => {
                botManager.addBot(token, DOMAIN);
                resolve({ token, info });
            })
            .catch(error => reject(error));
    });
}

module.exports = { getBotInfo, startBot };