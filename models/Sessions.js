const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SessionSchema = new Schema({
    'sessionKey': String,
    'sessionValue': String,
    'expireTime': {type: Number, default: Date.now + 1000 * 60 * 60 * 24}
})

module.exports = mongoose.model('Session', SessionSchema)