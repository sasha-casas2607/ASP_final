//Address Schema    
const { Long, Double } = require('mongodb');
const mongoose = require('mongoose');                
const offersSchema = new mongoose.Schema({
    person_offering: {
        type: String,
        required: true
    },
    person_proposing: {
        type: [String],
        required: true
    },
    person_accepting: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    rating: {
        type: Number,
        required: true
    },
    availability: {
        type: [Date], 
        required: true
    },
    location: {
        type: [Number], 
        required: true
    },
    image: {
        type: String
    }
})

module.exports = mongoose.model('offers_model', offersSchema)