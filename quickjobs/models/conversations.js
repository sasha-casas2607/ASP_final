//Address Schema    
const { Long } = require('mongodb');
const mongoose = require('mongoose');                
const conversationsSchema = new mongoose.Schema({
    person1: {
        type: String,
        required: true
    },
    person2: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('conversations_model', conversationsSchema)