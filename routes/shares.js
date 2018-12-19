const express = require('express')
const router = express.Router()

const User = require('../models/Users')
const PDF = require('../models/PDFs')
const {checkHasProp} = require('../store/utils')

router.post('/pdf', async function (req, res) {
    if (!req.session.user) return
    const { url, name, xiaoanhao } = req.body
    if (xiaoanhao !== 'xiaoanhao') return
    const pdfStored = await PDF.findOne({url})
    if (!pdfStored) {
        const pdf = new PDF({
            url,
            name
        })
        await pdf.save()
        return res.json({
            ok: true,
            msg: 'pdf外链保存成功'
        })
    } else {
        return res.json({
            ok: false,
            msg: '这本pdf已经有啦'
        })
    }
})

router.get('/pdfs', async function (req, res) {
    let pdfs = await PDF.find().select('_id name').sort('-addTime').exec()
    return res.json({
        ok: true,
        msg: pdfs
    })
})

router.get('/pdf', async function (req, res) {
    const { id } = req.query
    try {
        let pdf = await PDF.findById(id)
        return res.json({
            ok: true,
            msg: pdf.url
        })
    } catch (e) {
        return res.json({
            ok: false,
            msg: '啊哦，发生了一个错误 (ಥ_ಥ) '
        })
    }
})

module.exports = router;