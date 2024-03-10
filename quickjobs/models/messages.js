//Address Schema    
const { Long } = require('mongodb');
const mongoose = require('mongoose');                
const { boolean } = require('webidl-conversions');
const messagesSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    person_sent: {
        type: String,
        required: true
    },
    conversation_id: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('messages_model', messagesSchema)