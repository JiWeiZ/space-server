const mongoose = require('mongoose')
const Schema = mongoose.Schema
const {updateRefArrFiled} = require('../store/utils')

const CategorySchema = new Schema({
    'content': {type:String, minlength: 1},
    'labels': [{type: Schema.Types.ObjectId, ref: "Label"}],
    'creator': {type: Schema.Types.ObjectId, ref: 'User'},
    'blogs': [{type: Schema.Types.ObjectId, ref: 'Blog'}],
    'blogDrafts': [{type: Schema.Types.ObjectId, ref: 'BlogDraft'}],
    'addTime': {type: Number, default: Date.now}
})

CategorySchema.methods.updateRefArrFiled = updateRefArrFiled
                       
CategorySchema.methods.deleteRefFiled = async function(filedName, filedId) {
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
        // 如果该类别没有被任何博文或草稿引用，就删除它
        if (this.blogDrafts.length === 0 && this.blogs.length === 0) {
            // 删除标签对该类别的引用
            let labels = this.labels
            for (var i = 0; i < labels.length; i++) {
                let label = await this.model('Label').findById(labels[i])
                let label_categories = label.categories
                for (var j = 0; j < label_categories.length; j++) {
                    if (label_categories[j].equals(this._id)) {
                        label_categories.splice(j, 1)
                        break
                    }
                }
                await label.updateOne({categories: label_categories})
            }
            // 删除该类别         
            await this.model('Category').findByIdAndRemove(this._id)
            return null
        } else {
            return this
        }
    } else {
        return new Error('blogDrafts为空，无法删除')
    }
}

CategorySchema.statics.updateOneOrCreate = async function (content, userId, fileds) {
    // 存在就返回doc，不存在先创建
    let categoryBeforeUpdate = await this.findOne({content}).exec()
    if (!categoryBeforeUpdate) {
        categoryBeforeUpdate = await this.create({content, creator: userId})
    }
    // 更新引用字段
    if (fileds && fileds.length) {
        for (var filed of fileds) {
            categoryBeforeUpdate.updateRefArrFiled(filed.name, filed.content)
        }
    }
    // 返回更新后的model
    let categoryUpdated = await this.findById(categoryBeforeUpdate._id)
    return categoryUpdated
}

module.exports = mongoose.model('Category', CategorySchema)