const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ValidateCodeSchema = new Schema({
    'email': String,
    'code': String,
    'addTime': {type: Number, default: Date.now}
})

module.exports = mongoose.model('Validatecode', ValidateCodeSchema)