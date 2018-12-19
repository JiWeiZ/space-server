const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const multer = require('multer')
let upload = multer()
const qiniu = require('qiniu')

const { Blogs, BlogDrafts }= require('../models/Blogs')
const Categoires = require('../models/Categories')
const Labels = require('../models/Labels')
const Comments = require('../models/Comments')
const Users = require('../models/Users')
const {imgRegex} = require('../store/params')
const { checkHasProp, toText } = require('../store/utils')
const {accessKey, secretKey, qiniu_bucket, qiniu_domain} = require('../store/qiniuKey')

mongoose.connect('mongodb://localhost:27017/space', {useNewUrlParser: true})

mongoose.connection.on('connected', () => {
    console.log('mongodb: space connected')
})

router.get('/', async function (req, res) {
    const {id} = req.query
    // 参数检查
    try {
        await Promise.all([
            checkHasProp(res, id, '出错了'),
        ])
    } catch (statusCode) {
        if (statusCode >= 400) return
    }
    let blog = await Blogs.findById_Read(id)
    // 阅读量加1
    await blog.updateOne({viewNum: blog.viewNum + 1})
    await res.json({
        ok: true,
        msg: blog
    })
})

router.get('/getCategorieAndLabels', async function (req, res) {
    let categoires = await Categoires
        .find()
        .populate({path: 'labels', select: 'content'})
        .exec()
    let arr = []
    for (let item of categoires) {
        var obj = {}
        obj._id = item._id
        obj.category = item.content
        obj.labels = item.labels.map(e => {
            return {
                _id: e._id,
                content: e.content
            }
        })
        arr.push(obj)
    }
    return res.json({
        ok: true,
        msg: arr
    })
})

router.get('/getCategories', async function (req, res) {
    let categories = await Categoires
        .find({$where: "this.blogs.length > 0"})
        .select('content blogs')
        .exec()
    let blogsTotalCount = await Blogs.countTotalNum()
    // 每个category下的blogs都要去除isDeleted为true的blog
    for (let category of categories) {
        let blogsY = [] // blogsY用来接收isDeleted为true的blog
        let promiseArr = category.blogs.map(e => {
            return Blogs.findOne({_id: e, isDeleted: false}).select('isDeleted').exec()
        })
        await Promise.all(promiseArr).then(modelArr => {
            modelArr.forEach((e) => {
                if (e !== null) blogsY.push(e)
            })
        })
        category.blogs = blogsY
    }
    // 去除blogs为空的category
    // splice不能用于for循环的删除，每次循环的index会变
    let categoriesY = []
    categories.forEach(item => {
        if (item.blogs.length !== 0) {
            categoriesY.push(item)
        }
    })
    return res.json({
        ok: true,
        blogsTotalCount,
        msg: categoriesY
    })
})

router.get('/getLabels', async function (req, res) {
    let labels = await Labels
        .find({$where: "this.blogs.length > 0"})
        .select('content blogs')
        .exec()
    let blogsTotalCount = await Blogs.countTotalNum()
    // 每个category下的blogs都要去除isDeleted为true的blog
    for (let label of labels) {
        let blogsY = [] // blogsY用来接收isDeleted为true的blog
        let promiseArr = label.blogs.map(e => {
            return Blogs.findOne({_id: e, isDeleted: false}).select('isDeleted').exec()
        })
        await Promise.all(promiseArr).then(modelArr => {
            modelArr.forEach((e) => {
                if (e !== null) blogsY.push(e)
            })
        })
        label.blogs = blogsY
    }
    // 去除blogs为空的label
    let labelsY = []
    labels.forEach(item => {
        if (item.blogs.length !== 0) {
            labelsY.push(item)
        }
    })
    return res.json({
        ok: true,
        blogsTotalCount,
        msg: labelsY
    })
})

router.get('/getBlogList', async function (req, res) {
    if (!req.query.type) return
    const type = req.query.type
    let page = req.query.page ? parseInt(req.query.page) : 1,
        pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 5,
        sortParamArr = req.query.sortParams && req.query.sortParams.length ? req.query.sortParams : ['-addTime'],
        findParams = req.query.findParams ? req.query.findParams : undefined,
        sortParams = sortParamArr.join(' ').trim(),
        skip = (page - 1) * pageSize,
        blogs, params, totalNum
        if (type === 'allBlogs') {
            params = {}
            totalNum = await Blogs.countTotalNum(params)
            blogs = await Blogs.findAll(params, skip, pageSize, sortParams)
        } else if (type === 'personalBlogs') {
            params = { creator: findParams.userId }
            totalNum = await Blogs.countTotalNum(params)
            blogs = await Blogs.findAll(params, skip, pageSize, sortParams)
        } else if (type === 'allBlogDrafts') {
            try {
                await Promise.all([
                    checkHasProp(res, req.session.user, '请先登录'),
                ])
            } catch (statusCode) {
                if (statusCode >= 400) return
            }
            params = { creator: req.session.user._id }
            totalNum = await BlogDrafts.countTotalNum(params)
            blogs = await BlogDrafts.findAll(params, skip, pageSize, sortParams)
        } else if (type === 'trash') {
            params = {creator: req.session.user._id}
            blogs = await Blogs.findDeleted(params, skip, pageSize, sortParams)
            let blogDrafts = await BlogDrafts.findDeleted(params, skip, pageSize, sortParams)
            blogs = blogs.concat(blogDrafts)
            totalNum = blogs.length
        } else if (type === 'commented') {
        
        } else if (type === 'like') {
            try {
                await Promise.all([
                    checkHasProp(res, req.session.user, '请先登录'),
                ])
            } catch (statusCode) {
                if (statusCode >= 400) return
            }
            let user = await Users.findById(req.session.user._id)
            params = {_id: {$in: user.blogsLiked}}
            totalNum = user.blogsLiked.length
            blogs = await Blogs.findAll(params, skip, pageSize, sortParams)
        } else if (type.match(/category-\w{24}/)) {
            params = {category: findParams.categoryId}
            totalNum = await Blogs.countTotalNum(params)
            blogs = await Blogs.findAll(params, skip, pageSize, sortParams)
        } else if (type.match(/label-\w{24}/)) {
            let label = await Labels.findById(findParams.labelId)
            params = {_id: {$in: label.blogs}}
            totalNum = label.blogs.length
            blogs = await Blogs.findAll(params, skip, pageSize, sortParams)
        }
    return res.json({
        ok: true,
        totalNum,
        msg: blogs
    })
})

router.get('/draft', async function (req, res) {
    const {id} = req.query
        // 参数检查
        try {
            await Promise.all([
                checkHasProp(res, req.session.user, '请先登录'),
                checkHasProp(res, id, '出错了'),
            ])
        } catch (statusCode) {
            if (statusCode >= 400) return
        }
        let blogDraft = await BlogDrafts.findById_Edit(id)
        if (req.session.user._id !== blogDraft.creator.id) {
            return res.status(403).json({
                ok: false,
                msg: 'You are not the author of this blog, pleae leave now'
            })
        }
        return res.json({
            ok: true,
            msg: blogDraft
        })
})

router.get('/edit', async function (req, res) {
    const {id} = req.query
        // 参数检查
        try {
            await Promise.all([
                checkHasProp(res, req.session.user, '请先登录'),
                checkHasProp(res, id, '出错了'),
            ])
        } catch (statusCode) {
            if (statusCode >= 400) return
        }
        let blog = await Blogs.findById_Edit(id)
        if (req.session.user._id !== blog.creator.id) {
            return res.status(403).json({
                ok: false,
                msg: 'You are not the author of this blog, pleae leave now'
            })
        }
        return res.json({
            ok: true,
            msg: blog
        })
})

router.get('/comments', async function (req, res) {
    let {blogId} = req.query
    if (!(blogId)) return
    let blog = await Blogs.findById(blogId).select('_id')
    let commentsL0 = await Comments
        .find({
            replyBlog: blog._id,
            level: 0
        })
        .populate({path: 'creator', select: 'userName'})
        .sort('-addTime')
    for (let comment of commentsL0 ) {
        let commentsL1 = await Comments
            .find({
                replyBlog: blog._id,
                replyCommentL0: comment._id,
                level: 1
            })
            .populate({path: 'creator', select: 'userName'})
            .populate({
                path: 'replyCommentL0',
                select: 'touristName creator',
                populate: {path: 'creator', select: 'userName'}
            })
            .populate({
                path: 'replyCommentL1',
                select: 'touristName creator',
                populate: {path: 'creator', select: 'userName'}
            })            
            .sort('-addTime')
        comment.commentsL1 = commentsL1
    }
    return res.json({
        ok: true,
        msg: commentsL0.map(e => {
            return {
                _id: e._id,
                level: e.level,
                addTime: e.addTime,
                commentsL1: e.commentsL1,
                content: e.content,
                creator: e.creator || undefined,
                touristName: e.touristName || undefined,
                replyBlog: e.replyBlog || undefined,
                replyCommentL0: e.replyCommentL0 || undefined
            }
        })
    })
})

router.get('/timeline', async function (req, res) {
    let blogs = await Blogs.findAll_Brief()
    return res.json({
        ok: true,
        msg: blogs
    })
})

router.get('/userStatistics', async function (req, res) {
    let {userId} = req.query
    let user = await Users.findById(userId)
    if (user) {
        let params = { creator: userId }
        let blogsNum = await Blogs.countTotalNum(params)
        let blogDraftsNum = await BlogDrafts.countTotalNum(params)
        let likedNum = user.blogsLiked.length
        let commentsNum = await Comments.find(params).count().exec()
        return res.json({
            ok: true,
            msg: { blogsNum, blogDraftsNum, likedNum, commentsNum}
        })
    } else {
        res.json({
            ok: false,
            msg: '用户不存在'
        })
    }
})

router.post('/draft', async function (req, res) {
    let {id, title, category: categoryContent, labels, sourceValue, abstract} = req.body
    // 参数检查
    try {
        await Promise.all([
            checkHasProp(res, req.session.user, '请先登录'),
            checkHasProp(res, title, '请输入标题'),
            checkHasProp(res, sourceValue, '空内容是没法保存的')
        ])
    } catch (statusCode) {
        if (statusCode >= 400) return
    }
    // 获取用户id，图片摘要，文字摘要
    const userId = req.session.user._id,
        imgMatch = sourceValue.match(imgRegex),
        imgAbstract = imgMatch ? imgMatch[1] : ''
    abstract = abstract ? abstract : ''
    // 获取标签
    let labelIds = [], labelDocs = []
    for (let labelContent of labels) {
        let label = await Labels.findOneOrCreate(labelContent, userId)
        labelDocs.push(label)
        labelIds.push(label._id)
    }
    // 获取类别
    let category
    if (categoryContent) category = await Categoires.updateOneOrCreate(categoryContent, userId, [{name: 'labels', content: labelIds}])

    try {
        if (!id) {
            // 如果id是空的，新建草稿
            let newBlogDraft = new BlogDrafts({
                title,
                imgAbstract,
                abstract,
                sourceValue,
                creator: userId,
                category: category ? category._id : null,
                labels: labelIds
            })
            newBlogDraft = await newBlogDraft.save()
            // 在该类别下添加草稿Id
            if (category) {
                await category.updateRefArrFiled('blogDrafts', newBlogDraft._id)
            }
            if (labelDocs.length) {
                for (let label of labelDocs) {
                    label.updateRefArrFiled('blogDrafts', newBlogDraft._id)
                    if (category) label.updateRefArrFiled('categories', category._id)
                }
            }
            return res.status(201).json({
                ok: true,
                msg: '草稿保存成功！',
                blogDraftId: newBlogDraft._id
            })
        } else {
            // id不是空的，更新草稿
            let blogDraft = await BlogDrafts.findById(id)

            let oldLabelIds = blogDraft.labels,
                oldLabelsLength = oldLabelIds.length,
                newLabelsLength = labelIds.length,
                labelsIntersect = [],
                labelsToDelete = [],
                labelsToAdd = []
            // 获取labelsIntersect，labelsToDelete及labelsToAdd
            for (var i = 0; i < oldLabelsLength; i++) {
                for (var j = 0; j < newLabelsLength; j++) {
                    if (oldLabelIds[i].equals(labelIds[j])) {
                        labelsIntersect.push(labelIds[j])
                        break;
                    }
                }
                if (j === newLabelsLength) labelsToDelete.push(oldLabelIds[i])
            }
            for (var i = 0; i < newLabelsLength; i++) {
                for (var j = 0; j < labelsIntersect.length; j++) {
                    if (labelIds[i].equals(labelsIntersect[j])) break;
                }
                if (j === labelsIntersect.length) labelsToAdd.push(labelIds[i])
            }

            // 如果更改了类别，需要更新旧类别和新类别对草稿的引用
            if (category && !category._id.equals(blogDraft.category)) {
                let oldCategory = await Categoires.findById(blogDraft.category)
                if (oldCategory) await oldCategory.deleteRefFiled('blogDrafts', blogDraft._id)                
                await category.updateRefArrFiled('blogDrafts', blogDraft._id)
                // 添加标签ID对草稿分类的引用
                for (let label of labelsIntersect) {
                    let labelDoc = await Labels.findById(label)
                    if (category) labelDoc.updateRefArrFiled('categories', category._id)
                }               
            } else if (category === undefined) {
                let oldCategory = await Categoires.findById(blogDraft.category)
                if (oldCategory) await oldCategory.deleteRefFiled('blogDrafts', blogDraft._id)                
            }
            // 如果更改了标签，需要更新旧标签和新标签对草稿的引用
            // 添加标签ID对此草稿的引用以及对草稿分类的引用
            for (let label of labelsToAdd) {
                let labelDoc = await Labels.findById(label)
                await labelDoc.updateRefArrFiled('blogDrafts', blogDraft._id)
                if (category) labelDoc.updateRefArrFiled('categories', category._id)
            }
            // 删去标签ID对此草稿的引用
            for (let label of labelsToDelete) {
                let labelDoc = await Labels.findById(label)
                await labelDoc.deleteRefFiled('blogDrafts', blogDraft._id)
            }

            await blogDraft.updateOne({
                title,
                imgAbstract,
                abstract,
                sourceValue,
                updateTimes: blogDraft.updateTimes + 1,
                category: category ? category._id: null,
                labels: labelIds,
                latestUpdateTime: Date.now()
            })
            return res.status(201).json({
                ok: true,
                msg: '草稿更新成功！',
                blogDraftId: blogDraft._id
            })
        }
    } catch (e) {
        console.log(e)
        res.status(500).json({
            ok: false,
            msg: '啊哦，发生了一个错误 (ಥ_ಥ) '
        })
        return
    }
})

router.post('/save', async function (req, res) {
    let {id, blogDraftId, title, labels, sourceValue, abstract} = req.body
    let categoryContent
    if (req.body.category) {
        categoryContent = req.body.category
    } else {
        categoryContent = ''
    }
    // 参数检查
    try {
        await Promise.all([
            checkHasProp(res, req.session.user, '请先登录'),
            checkHasProp(res, title, '请输入标题'),
            checkHasProp(res, sourceValue, '空内容是没法保存的'),
            checkHasProp(res, categoryContent, '请给文章归类')
        ])
    } catch (statusCode) {
        if (statusCode >= 400) return
    }
    // 获取用户id，图片摘要，文字摘要
    const userId = req.session.user._id,
        imgMatch = sourceValue.match(imgRegex),
        imgAbstract = imgMatch ? imgMatch[1] : ''
    abstract = abstract ? abstract : ''
    // 获取标签
    let labelIds = [], labelDocs = []
    for (let labelContent of labels) {
        let label = await Labels.findOneOrCreate(labelContent, userId)
        labelDocs.push(label)
        labelIds.push(label._id)
    }
    // 获取类别
    let category
    if (categoryContent) category = await Categoires.updateOneOrCreate(categoryContent, userId, [{name: 'labels', content: labelIds}])

    // 获取草稿
    let blogDraft
    if (blogDraftId) blogDraft = await BlogDrafts.findById(blogDraftId)

    try {
        if (!id) {
            // 如果id是空的，新建博文
            let newBlog = new Blogs({
                title,
                imgAbstract,
                abstract,
                sourceValue,
                blogDraft: blogDraft ? blogDraft._id : null,
                creator: userId,
                category: category ? category._id : null,
                labels: labelIds
            })
            newBlog = await newBlog.save()
            // 在该类别下添加草稿Id
            if (category) {
                await category.updateRefArrFiled('blogs', newBlog._id)
            }
            if (blogDraft) {
                await blogDraft.updateOne({blog:newBlog._id}).exec()
            }
            if (labelDocs.length) {
                for (let label of labelDocs) {
                    label.updateRefArrFiled('blogs', newBlog._id)
                    if (category) label.updateRefArrFiled('categories', category._id)
                }
            }
            return res.status(201).json({
                ok: true,
                msg: '博文发布成功！',
                blogId: newBlog._id
            })
        } else {
            // id不是空的，更新博文
            let blog = await Blogs.findById(id)

            let oldLabelIds = blog.labels,
                oldLabelsLength = oldLabelIds.length,
                newLabelsLength = labelIds.length,
                labelsIntersect = [],
                labelsToDelete = [],
                labelsToAdd = []
            // 获取labelsIntersect，labelsToDelete及labelsToAdd
            for (var i = 0; i < oldLabelsLength; i++) {
                for (var j = 0; j < newLabelsLength; j++) {
                    if (oldLabelIds[i].equals(labelIds[j])) {
                        labelsIntersect.push(labelIds[j])
                        break;
                    }
                }
                if (j === newLabelsLength) labelsToDelete.push(oldLabelIds[i])
            }
            for (var i = 0; i < newLabelsLength; i++) {
                for (var j = 0; j < labelsIntersect.length; j++) {
                    if (labelIds[i].equals(labelsIntersect[j])) break;
                }
                if (j === labelsIntersect.length) labelsToAdd.push(labelIds[i])
            }

            // 如果更改了类别，需要更新旧类别和新类别对草稿的引用
            if (category && !category._id.equals(blog.category)) {
                let oldCategory = await Categoires.findById(blog.category)
                if (oldCategory) await oldCategory.deleteRefFiled('blogs', blog._id)                
                await category.updateRefArrFiled('blogs', blog._id)
                // 添加标签ID对博文分类的引用
                for (let label of labelsIntersect) {
                    let labelDoc = await Labels.findById(label)
                    if (category) labelDoc.updateRefArrFiled('categories', category._id)
                }               
            } else if (category === undefined) {
                let oldCategory = await Categoires.findById(blog.category)
                if (oldCategory) await oldCategory.deleteRefFiled('blogs', blog._id)                
            }
            // 如果更改了标签，需要更新旧标签和新标签对博文的引用
            // 添加标签ID对此博文的引用以及对博文分类的引用
            for (let label of labelsToAdd) {
                let labelDoc = await Labels.findById(label)
                await labelDoc.updateRefArrFiled('blogs', blog._id)
                if (category) labelDoc.updateRefArrFiled('categories', category._id)
            }
            // 删去标签ID对此博文的引用
            for (let label of labelsToDelete) {
                let labelDoc = await Labels.findById(label)
                await labelDoc.deleteRefFiled('blogs', blog._id)
            }

            await blog.updateOne({
                title,
                imgAbstract,
                abstract,
                sourceValue,
                updateTimes: blog.updateTimes + 1,
                category: category ? category._id: null,
                labels: labelIds,
                latestUpdateTime: Date.now()
            })
            return res.status(201).json({
                ok: true,
                msg: '博文更新成功！',
                blogId: blog._id
            })
        }
    } catch (e) {
        console.log(e)
        res.status(500).json({
            ok: false,
            msg: '啊哦，发生了一个错误 (ಥ_ಥ) '
        })
        return
    }
})

router.post('/delete', async function (req, res) {
    let {id, realDelete, isDraft} = req.body
    // 参数检查
    try {
        await Promise.all([
            checkHasProp(res, req.session.user, '请先登录'),
            checkHasProp(res, id, '你博客id呢？')
        ])
    } catch (statusCode) {
        if (statusCode >= 400) return
    }
    let blog
    if (isDraft) {
        blog = await BlogDrafts.findById(id).exec()
    } else {
        blog = await Blogs.findById(id).exec()
    }
    if (req.session.user._id !== blog.creator._id.toString()) {
        return res.status(403).json({
            ok: false,
            msg: 'You are not the author of this blog, pleae leave now'
        })
    }
    if (realDelete) {
        if (isDraft) {
            // 删除分类引用 这里的blog变量实际上是blogDraft
            let category = await Categoires.findById(blog.category).exec()
            if(category) await category.deleteRefFiled('blogDrafts', blog._id)
            // 删除标签引用
            for (let label of blog.labels) {
                let labelDoc = await Labels.findById(label).exec()
                await labelDoc.deleteRefFiled('blogDrafts', blog._id)
            }
            // 删除博文
            await BlogDrafts.findByIdAndRemove(id)
        } else {
            // 删除分类引用
            let category = await Categoires.findById(blog.category).exec()
            if(category) await category.deleteRefFiled('blogs', blog._id)
            // 删除标签引用
            for (let label of blog.labels) {
                let labelDoc = await Labels.findById(label).exec()
                await labelDoc.deleteRefFiled('blogs', blog._id)
            }
            // 删除用户喜欢
            for (let user of blog.usersLiked) {
                let userDoc = await Users.findById(user).exec()
                await userDoc.deleteRefFiled('blogsLiked', blog._id)
            }
            // 删除相关评论
            await Comments.deleteMany({replyBlog: blog._id}).exec()
            // 删除博文
            await Blogs.findByIdAndRemove(id)
        }
    } else {
        await blog.updateOne({isDeleted: true, deleteTime: Date.now()})
    }
    return res.json({
        ok: true,
        msg: realDelete ? '已彻底删除' : '已扔进废纸篓'
    })
})

router.post('/restore', async function (req, res) {
    let {id, isDraft} = req.body
    // 参数检查
    try {
        await Promise.all([
            checkHasProp(res, req.session.user, '请先登录'),
            checkHasProp(res, id, '你博客id呢？')
        ])
    } catch (statusCode) {
        if (statusCode >= 400) return
    }
    let blog
    if (isDraft) {
        blog = await BlogDrafts.findById(id).exec()
    } else {
        blog = await Blogs.findById(id).exec()
    }
    if (req.session.user._id !== blog.creator._id.toString()) {
        return res.status(403).json({
            ok: false,
            msg: 'You are not the author of this blog, pleae leave now'
        })
    }
    await blog.updateOne({isDeleted: false})
    return res.json({
        ok: true,
        msg: '恢复成功！'
    })
})

router.post('/like', async function (req, res) {
    const {id, liked} = req.body
    // 参数检查
    try {
        await Promise.all([
            checkHasProp(res, req.session.user, '请先登录'),
            checkHasProp(res, id, '出错了'),
        ])
    } catch (statusCode) {
        if (statusCode >= 400) return
    }
    let user = await Users.findById(req.session.user._id)
    let blog = await Blogs.findById(id)
    if (!blog) return res.json({
        ok: false,
        msg: 'blog不存在'
    })
    // 收藏 or 取消收藏
    if (liked) {
        await user.updateRefArrFiled('blogsLiked', blog._id)
        await blog.updateOne({
            likedNum: blog.likedNum + 1
        })
        await blog.updateRefArrFiled('usersLiked', user._id)
        return res.json({
            ok: true,
            liked: true,
            msg: '喜欢了一下'
        })    
    } else {
        await user.deleteRefFiled('blogsLiked', blog._id)
        if (blog.likedNum > 0) {
            await blog.updateOne({
                likedNum: blog.likedNum - 1
            })
        }
        await blog.deleteRefFiled('usersLiked', user._id)
        return res.json({
            ok: true,
            liked: false,
            msg: '已取消喜欢'
        })
    }
})

router.post('/comment', async function (req, res) {
    let {blogId, commentL0Id, commentL1Id, touristName, touristEmail, content, level} =  req.body
    let blog, commentL0, commentL1, creator
    if (blogId) blog = await Blogs.findById(blogId)
    if (commentL0Id) commentL0 = await Comments.findById(commentL0Id)
    if (commentL1Id) commentL1 = await Comments.findById(commentL1Id)
    if (req.session.user) creator = await Users.findById(req.session.user._id)
    // 参数检查
    try {
        if (!creator) {
            await Promise.all([
                checkHasProp(res, touristName, '名称未填'),
                checkHasProp(res, touristEmail, '邮箱未填（不会被公开）')
            ])
        }
        await Promise.all([
            checkHasProp(res, blogId, 'blogId不存在'),
            checkHasProp(res, content, '说点什么吧')
        ])
    } catch (statusCode) {
        if (statusCode >= 400) return
    }
    let newComment
    try {
        if (creator) {
            newComment = new Comments({
                content,
                level,
                replyBlog: blog._id,
                replyCommentL0: commentL0 ? commentL0._id : null,
                replyCommentL1: commentL1 ? commentL1._id : null,
                creator: creator._id
            })
        } else {
            newComment = new Comments({
                content,
                level,
                replyBlog: blog._id,
                replyCommentL0: commentL0 ? commentL0._id : null,
                replyCommentL1: commentL1 ? commentL1._id : null,
                touristName,
                touristEmail
            })
        }
        newComment = await newComment.save()
        let comments = blog.comments
        comments.push(newComment._id)
        await blog.updateOne({
            comments,
            commentsNum: blog.commentsNum + 1
        })
    } catch (e) {
        console.log(e)
    }
    return res.json({
        ok: true,
        msg: newComment
    })
})

router.post('/uploadToken', async function (req, res) {
    // 参数检查
    try {
        await Promise.all([
            checkHasProp(res, req.session.user, '请先登录')
        ])
    } catch (statusCode) {
        if (statusCode >= 400) return
    }
    let mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
    let options = {
        scope: qiniu_bucket,
        fsizeLimit: 1024 * 1024,
        returnBody: `{"url": "http://${qiniu_domain}/$(key)", "fsize":$(fsize)}`
    }
    let putPolicy = new qiniu.rs.PutPolicy(options)
    let uploadToken = putPolicy.uploadToken(mac)
    return res.json({
        ok: true,
        msg: uploadToken
    })    
})

module.exports = router