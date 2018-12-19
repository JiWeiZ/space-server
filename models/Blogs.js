const mongoose = require('mongoose')
const Schema = mongoose.Schema
const {updateRefArrFiled, deleteRefFiled } = require('../store/utils')

const BlogDraftSchema = new Schema({
    'title': {type:String, minlength: 1},
    'imgAbstract': String,
    'abstract': String,
    'isDraft': {type: Boolean, default: true},
    'sourceValue': {type:String, minlength: 1},
    'updateTimes' : {type:Number, default: 0},
    'viewNum': {type: Number, default: 0},
    'blog': {type: Schema.Types.ObjectId, ref: 'Blog'},
    'creator': {type: Schema.Types.ObjectId, ref: 'User'},
    'category': {type: Schema.Types.ObjectId, ref: 'Category'},
    'labels': [{type: Schema.Types.ObjectId, ref: 'Label'}],
    'isDeleted': { type: Boolean, default: false},
    'deleteTime': {type: Number, default: 0}, 
    'latestUpdateTime': {type: Number, default: Date.now}, 
    'addTime': {type: Number, default: Date.now}
})

const BlogSchema = new Schema({ 
    'title': {type:String, minlength: 1},
    'imgAbstract': String,
    'abstract': String,
    'isDraft': {type: Boolean, default: false},
    'sourceValue': {type:String, minlength: 1},
    'updateTimes' : {type:Number, default: 1},
    'viewNum': {type: Number, default: 0},
    'likedNum': {type: Number, default: 0},
    'commentsNum': {type: Number, default: 0},
    'blogDraft': {type: Schema.Types.ObjectId, ref: 'BlogDraft'},
    'creator': {type: Schema.Types.ObjectId, ref: 'User'},
    'category': {type: Schema.Types.ObjectId, ref: 'Category'},
    'labels': [{type: Schema.Types.ObjectId, ref: 'Label'}],
    'comments': [{type: Schema.Types.ObjectId, ref: 'Comment'}],
    'usersLiked': [{type: Schema.Types.ObjectId, ref: 'User'}],
    'isDeleted': { type: Boolean, default: false},
    'deleteTime': {type: Number, default: 0},
    'latestUpdateTime': {type: Number, default: Date.now}, 
    'addTime': {type: Number, default: Date.now}
})

async function findHot (pageSize) {
    let blogs = await this
    .find({})
    .where('isDeleted').equals(false)
    .limit(pageSize)
    .sort('-viewNum')
    .populate({path: 'category', select: 'content'})
    .populate({path: 'labels', select: 'content'})
    .populate({path: 'creator', select: 'userName'})
    .exec()
    return blogs
}

async function findLatest (pageSize) {
    let blogs = await this
    .find({})
    .where('isDeleted').equals(false)
    .limit(pageSize)
    .sort('-addTime')
    .populate({path: 'category', select: 'content'})
    .populate({path: 'labels', select: 'content'})
    .populate({path: 'creator', select: 'userName'})
    .exec()
    return blogs
}

async function findDeleted (params, skip, pageSize, sortParams) {
    let blogs = await this
    .find(params)
    .where('isDeleted').equals(true)
    .select('-sourceValue')
    .populate({path: 'category', select: 'content'})
    .populate({path: 'labels', select: 'content'})
    .populate({path: 'creator', select: 'userName'})
    .skip(skip)
    .limit(pageSize)
    .sort(sortParams)
    .exec()
    return blogs
}

async function findAll (params, skip, pageSize, sortParams) {
    let blogs = await this
    .find(params)
    .where('isDeleted').equals(false)
    .select('-sourceValue')
    .populate({path: 'category', select: 'content'})
    .populate({path: 'labels', select: 'content'})
    .populate({path: 'creator', select: 'userName'})
    .skip(skip)
    .limit(pageSize)
    .sort(sortParams)
    .exec()
    return blogs
}

async function findById_Read (id) {
    let blogs = await this
    .findById(id)
    .where('isDeleted').equals(false)
    .select('-imgAbstract -abstract')
    .populate({path: 'category', select: 'content'})
    .populate({path: 'labels', select: 'content'})
    .populate({path: 'creator', select: 'userName portrait'})
    .exec()
    if (blogs.isDeleted) {
        return null
    } else {
        return blogs
    }
}

async function findById_Edit (id) {
    let blogs = await this
    .findById(id)
    .where('isDeleted').equals(false)
    .select('-imgAbstract -abstract')
    .populate({path: 'category', select: 'content'})
    .populate({path: 'labels', select: 'content'})
    .populate({path: 'creator', select: 'userName'})
    .exec()
    if (blogs.isDeleted) {
        return null
    } else {
        return blogs
    }
}

async function countTotalNum (params) {
    if (!params) params={}
    let totalNum = await this
    .find(params)
    .where('isDeleted').equals(false)    
    .count()
    .exec()
    return totalNum
}

async function findAll_Brief() {
    let blogs = await this
    .find()
    .where('isDeleted').equals(false)
    .select('title addTime creator')
    .populate({path: 'creator', select: 'userName'})
    .sort('-addTime')
    .exec()
    return blogs
}

BlogDraftSchema.statics.findAll = findAll
BlogDraftSchema.statics.findById_Edit = findById_Edit
BlogDraftSchema.statics.countTotalNum = countTotalNum
BlogDraftSchema.statics.findDeleted = findDeleted

BlogSchema.statics.findAll = findAll
BlogSchema.statics.findById_Edit = findById_Edit
BlogSchema.statics.countTotalNum = countTotalNum
BlogSchema.statics.findDeleted = findDeleted
BlogSchema.statics.findById_Read = findById_Read
BlogSchema.statics.findHot = findHot
BlogSchema.statics.findLatest = findLatest
BlogSchema.statics.findAll_Brief = findAll_Brief

BlogSchema.methods.updateRefArrFiled = updateRefArrFiled
BlogSchema.methods.deleteRefFiled = deleteRefFiled

exports.BlogDrafts = mongoose.model('BlogDraft', BlogDraftSchema)
exports.Blogs = mongoose.model('Blog', BlogSchema)