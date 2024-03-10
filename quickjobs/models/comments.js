//Address Schema    
const { Long, Int32 } = require('mongodb');
const mongoose = require('mongoose');                
const commentsSchema = new mongoose.Schema({
    comment: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    offer_id: {
        type: String,
        required: true
    }

})

module.exports = mongoose.model('comments_model', commentsSchema)