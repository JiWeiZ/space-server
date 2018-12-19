const mongoose = require('mongoose')
const Schema = mongoose.Schema
const {updateRefArrFiled} = require('../store/utils')

const LabelSchema = new Schema({
    'content': {type:String, minlength: 1},
    'creator': { type: Schema.Types.ObjectId, ref: 'User' },
    'categories': [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    'blogs': [{ type: Schema.Types.ObjectId, ref: 'Blog' }],
    'blogDrafts': [{ type: Schema.Types.ObjectId, ref: 'BlogDraft' }],
    'addTime': { type: Number, default: Date.now }
})

LabelSchema.methods.updateRefArrFiled = updateRefArrFiled

LabelSchema.methods.deleteRefFiled = async function(filedName, filedId) {
    let filedStored = this[filedName] ? this[filedName] : []
    if (filedStored.length) {
        // 删除选中的那个引用字段
        for (let index in filedStored) {
            if (filedStored[index].equals(filedId)) {
                filedStored.splice(index, 1)
                break
            }
        }
        // 更新doc
        await this.updateOne({[filedName]: filedStored})
        // 如果该标签没有被任何博文或草稿引用，就删除它
        if (this.blogDrafts.length === 0 && this.blogs.length === 0) {
            // 删除类别对该标签的引用
            let categories = this.categories
            for (var i = 0; i < categories.length; i++) {
                let category = await this.model('Category').findById(categories[i])
                let category_labels = category.labels
                for (var j = 0; j < category_labels.length; j++) {
                    if (category_labels[j].equals(this._id)) {
                        category_labels.splice(j, 1)
                        break
                    }
                }
                await category.updateOne({labels: category_labels})
            }
            // 删除该标签         
            await this.model('Label').findByIdAndRemove(this._id)
            return null
        } else {
            return this
        }
    } else {
        return new Error('blogDrafts为空，无法删除')
    }
}

LabelSchema.statics.findOneOrCreate = async function (content, userId) {
    const labelStored = await this.findOne({content}).exec()
    if (labelStored) {
        return labelStored
    } else {
        let label = await this.model('Label').create({ content, creator: userId })
        return label
    }
}

module.exports = mongoose.model('Label', LabelSchema)