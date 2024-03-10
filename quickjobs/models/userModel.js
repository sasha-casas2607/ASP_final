//Address Schema    
const mongoose = require('mongoose');                
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    qualifications: {
        type: String
    },
    image: {
        type: String
    },
    facebook: {
        type: String
    },
    instagram: {
        type: String
    },
    tiktok: {
        type: String
    },
    location: {
        type: [Number],
        required: true
    },
    user_rating: {
        type: Number,
        required: true
    },
})

module.exports = mongoose.model('user_logins', userSchema)