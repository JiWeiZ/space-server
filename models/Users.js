const mongoose = require('mongoose')
const Schema = mongoose.Schema
const {updateRefArrFiled, deleteRefFiled} = require('../store/utils')

const UserSchema = new Schema({
    'userName': {type: String, maxlength:12},
    'password': String,
    'email': String,
    'portrait': {type: String, default: require('../store/params').defaultPortrait},
    'briefIntro': {type: String, default: '这个人很懒，什么也没留下', maxlength: 100},
    'blogsLiked': [{type: Schema.Types.ObjectId, ref: 'Blog'}],
    'addTime': {type: Number, default: Date.now}

    // addTime的default千万不要写成Date.now()
    // `Date.now()` returns the current unix timestamp as a number
    // 实际测试发现这玩意只在服务器启动时计算，然后就是一个const，真的坑
    // 另外之所以type不写成date，是因为mongoose没法指定时区，数据库显示的是UTC时间，为了防止误导干脆直接存时间戳
    // 写成Number方便比较大小
})

UserSchema.methods.updateRefArrFiled = updateRefArrFiled
UserSchema.methods.deleteRefFiled = deleteRefFiled

// UserSchema.methods.deleteRefFiled = async function (filedName, filedId) {
//     let filedStored = this[filedName] ? this[filedName] : []
//     if (filedStored.length) {
//         // 删除选中的那个引用字段
//         for (let index in filedStored) {
//             if (filedStored[index].equals(filedId)) {
//                 filedStored.splice(index, 1)
//                 break
//             }
//         }
//         // 更新doc
//         await this.updateOne({[filedName]: filedStored})        
//     }
// }

module.exports = mongoose.model('User', UserSchema)