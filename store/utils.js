/**
 * 随机生成任意位整数
 * @param {Number} digits 随机生成整数的位数
 * @returns {Number}  随机生成的整数
 */
function genRandomNumber (digits) {
  const start = 10 ** (digits - 1)
  const end = 10 ** digits
  return Math.floor(start + Math.random() * (end - start))
}

/**
 * 回调转化为Promise
 * @param {Function} fn 使用回调函数进行异步操作的函数，fn([,args], callback(err, data))
 * @returns {Promise} Promise
 */
function promisify (fn) {
  return function (...args) {
    return new Promise ((resolve, reject) => {
      fn(...args, (err, data) => err ? reject(err) : resolve(data))
    })
  }
}

/**
 * 依据对象的某个属性排序，默认升序
 * @param {Object} objs 要排序的对象数组/类数组 
 * @param {String} prop 依据的哪个属性值排序
 * @param {number} [sort=1] 1升序，-1降序
 * @returns {Array} 排序后的对象数组（不改变原数组）
 */
function sortObj (objs, prop, sort = 1) {
  objs = Array.prototype.slice.call(objs)
  objs.sort(function (a, b) {
    if (typeof a !== 'object' || typeof b !== 'object') return
    if (typeof a[prop] !== typeof b[prop]) return
    return sort * (a[prop] - b[prop])
  })
  return objs
}

/**
 * 给定一个对象数组和需要比较的属性值，返回属性值最小的对象
 * @param {*} objs
 * @param {*} prop
 * @returns {Object} 属性最小的对象
 */
function minObj (objs, prop) {
  objs = Array.prototype.slice.call(objs)
  let props = []
  for (let obj of objs) {
    props.push(obj[prop])
  }
  const minProp = Math.min(...props)
  for (let obj of objs) {
    if (obj[prop] === minProp) {
      return obj
    }
  }
}

/**
 * 给定一个对象数组和需要比较的属性值，返回属性值最大的对象
 * @param {*} objs
 * @param {*} prop
 * @returns {Object} 属性最大的对象
 */
function maxObj (objs, prop) {
  objs = Array.prototype.slice.call(objs)
  let props = []
  for (let obj of objs) {
    props.push(obj[prop])
  }
  const maxProp = Math.max(...props)
  for (let obj of objs) {
    if (obj[prop] === maxProp) {
      return obj
    }
  }
}

/**
 * 给定一个对象数组和对象属性，返回由对象数组中的属性构成的数组（去重后的），如：
 * objArr=[{a:1},{a:2},{a:3}], prop="a" ---> return [1,2,3]
 * @param {Object} objArr
 * @param {String} prop
 * @returns {Array}
 */
function objArrToPropArr (objArr, prop) {
  let arr = []
  for(let item of objArr){
    if (item[prop]) {
      arr.push(item[prop])
    }
  }
  return [...new Set(arr)]
}

/**
 * 检查某个属性值是否存在并给出提示信息
 * @param {*} res http响应response
 * @param {*} prop 要检查是否存在的属性值
 * @param {*} msg 返回的提示信息
 */
async function checkHasProp (res, prop, msg) {
  await new Promise((resolve, reject) => {
      if (prop) {
        resolve()
      } else {
        res.status(403).json({
          ok: false,
          msg
        })          
        reject(res.statusCode)
      }
  })
}

/**
 * HTML 转化为 纯文本
 * @param {*} HTML
 * @returns
 */
function toText (HTML) {
    var input = HTML;
    return input.replace(/<(style|script|iframe)[^>]*?>[\s\S]+?<\/\1\s*>/gi,'').replace(/<[^>]+?>/g,'').replace(/\s+/g,' ').replace(/ /g,' ').replace(/>/g,' ');  
}

/**
 * ObjectId数组去重
 * @param {*} ObjectIdArr
 * @returns ObjectIdArrUnique
 */
function uniqueObjectIds (ObjectIdArr) {
  // 去重，最笨的双for循环
  let arrUnique = []
  const arrayLen = ObjectIdArr.length
  for (var i = 0; i < arrayLen; i++) {
      // 注意这里不能用let j = 0，for循环用let相当于加了一个闭包，后面的if就访问不了j了
      for (var j = 0; j < arrUnique.length; j++ ) {
          // 不能使用 ===，或者Object.is()
          // 这里的equals是mongoDB的ObjectID类型的方法，用来比较两个ObjectID是否相等
          if (ObjectIdArr[i].equals(arrUnique[j])) {
              break;
          }
      }
      if (j === arrUnique.length) {
          arrUnique.push(ObjectIdArr[i])
      }
  }
  return arrUnique
}

/**
 * 更新标签和分类中的ref字段
 * @param {*} filedName
 * @param {*} filedId ObjectID
 * @returns
 */
async function updateRefArrFiled (filedName, filedId) {
  // 获取文档中存储的字段
  let filedStored = Array.prototype.slice.call(this[filedName])
  // 准备需要更新的字段（已去重）
  filedId instanceof Array ? filedStored = filedStored.concat(filedId) : filedStored.push(filedId)
  let filedToSave = uniqueObjectIds(filedStored)
  // 更新字段
  await this.updateOne({[filedName]: filedToSave}).exec()
  // 返回更新后的字段
  return filedToSave
}

async function deleteRefFiled (filedName, filedId) {
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
  }
}

module.exports = {
  genRandomNumber,
  promisify,
  sortObj,
  minObj,
  maxObj,
  objArrToPropArr,
  checkHasProp,
  toText,
  updateRefArrFiled,
  deleteRefFiled
}