const mongoose = require('mongoose')
const Schema = mongoose.Schema

const CommentSchema = new Schema({
    'content': String,
    'level': {type: Number, min: 0, max: 1, default: 0},
    'replyBlog': {type: Schema.Types.ObjectId, ref: 'Blog'},
    'touristName': String,
    'touristEmail': String,
    'creator': {type: Schema.Types.ObjectId, ref: 'User'},
    'replyCommentL0': {type: Schema.Types.ObjectId, ref: 'Comment'},
    'replyCommentL1': {type: Schema.Types.ObjectId, ref: 'Comment'},
    'addTime': {type: Number, default: Date.now}
})

module.exports = mongoose.model('Comment', CommentSchema)