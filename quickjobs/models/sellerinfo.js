//Address Schema    
const { Long } = require('mongodb');
const mongoose = require('mongoose');                
const sellerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    location: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('seller_model', sellerSchema)