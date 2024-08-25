const mongoose = require('mongoose');
const { token } = require('./database');

const tokenSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    botName: { type: String, required: true },
    userId: { type: Number, required: true, unique: true }
}, { timestamps: true });

const Token = token.model('Token', tokenSchema);

class Database {
    constructor(uri) {
        this.uri = uri;
    }

    async addToken(token, botName, userId) {
        try {
            const newToken = new Token({ token, botName, userId });
            return await newToken.save();
        } catch (err) {
            console.error('Error adding token:', err);
            throw err;
        }
    }

    async getTokens() {
        try {
            return await Token.find().lean();
        } catch (err) {
            console.error('Error getting tokens:', err);
            throw err;
        }
    }

    async getTokenByUserId(userId) {
        try {
            return await Token.findOne({ userId }).lean();
        } catch (err) {
            console.error('Error getting token by userId:', err);
            throw err;
        }
    }

    async getUserIdByToken(token) {
        try {
            return await Token.findOne({ token }).lean();
        } catch (err) {
            console.error('Error getting user id by token:', err);
            throw err;
        }
    }

    async deleteTokenByUserId(userId) {
        try {
            const result = await Token.deleteOne({ userId });
            if (result.deletedCount === 0) {
                throw new Error('No token found for the given userId');
            }
        } catch (err) {
            console.error('Error deleting token by userId:', err);
            throw err;
        }
    }

    async deleteToken(token) {
        try {
            const result = await Token.deleteOne({ token });
            if (result.deletedCount === 0) {
                throw new Error('No token found');
            }
        } catch (err) {
            console.error('Error deleting token:', err);
            throw err;
        }
    }

    async deleteAllTokens() {
        try {
            const result = await Token.deleteMany({});
            console.log(`Deleted ${result.deletedCount} tokens`);
        } catch (err) {
            console.error('Error deleting all tokens:', err);
            throw err;
        }
    }
}

module.exports = Database;