const mongoose = require('mongoose')
const Schema = mongoose.Schema

const PDFSchema = new Schema({
    'name': String,
    'url': String,
    'addTime': {type: Number, default: Date.now}
})

module.exports = mongoose.model('PDF', PDFSchema)