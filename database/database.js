const mongoose = require('mongoose');
const { MONGO_URI_TOKENS, MONGO_URI_PRODUCTS } = require('../config');

const product = mongoose.createConnection(MONGO_URI_PRODUCTS);

const token = mongoose.createConnection(MONGO_URI_TOKENS);

product.on('connected', () => {
    console.log('Connected to MongoDB Products');
});

product.on('error', (err) => {
    console.error('Error connecting to MongoDB Products:', err);
});

product.on('disconnected', () => {
    console.log('Disconnected from MongoDB Products');
});

token.on('connected', () => {
    console.log('Connected to MongoDB Tokens');
});

token.on('error', (err) => {
    console.error('Error connecting to MongoDB Tokens:', err);
});

token.on('disconnected', () => {
    console.log('Disconnected from MongoDB Tokens');
});

module.exports = { product, token };
