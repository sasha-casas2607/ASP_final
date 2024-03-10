//Address Schema    
const { Long, Int32 } = require('mongodb');
const mongoose = require('mongoose');                
const reviewsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    rating: {
        type: Number,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    offer_id: {
        type: String,
        required: true
    },
    person_offering: {
        type: String,
        required: true
    },
    person_accepting: {
        type: String,
        required: true
    }

})

module.exports = mongoose.model('reviews_model', reviewsSchema)