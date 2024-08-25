const mongoose = require('mongoose');
const { product, token } = require('./database');

const productSchema = new mongoose.Schema({
    botId: { type: String },
    name: { type: String},
    description: { type: String },
    price: { type: String }
}, { timestamps: true });

const Product = product.model('Product', productSchema);

class Database {
    constructor(uri) {
        this.uri = uri;
    }

    async addProduct(botId, name, price, description) {
        try {
            const newProduct = new Product({ botId, name, description, price });
            return await newProduct.save();
        } catch (err) {
            console.error('Error adding product:', err);
            return false;
        }
    }

    async getProducts(botId) {
        try {
            return await Product.find({ botId }).lean();
        } catch (err) {
            console.error('Error getting products:', err);
            throw err;
        }
    }

    async getProduct(botId, id) {
        try {
            return await Product.findOne({ botId, _id: id }).lean();
        } catch (err) {
            console.error('Error getting product:', err);
            throw err;
        }
    }

    async getProductByName(name) {
        try {
            return await Product.findOne({ name }).lean();
        } catch (err) {
            console.error('Error getting product:', err);
            throw err;
        }
    }

    async updateProduct(name, price, quantity) {
        try {
            return await Product.updateOne({ name }, { price, quantity });
        } catch (err) {
            console.error('Error updating product:', err);
            throw err;
        }
    }

    async deleteProduct(botId, _id) {
        try {
            return await Product.deleteOne({ botId, _id });
        } catch (err) {
            console.error('Error deleting product:', err);
            throw err;
        }
    }
}

module.exports = Database;  