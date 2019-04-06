const express = require('express')
const uuid = require('node-uuid')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const connection = require('../../connection.js') //引入连接数据库模块
const keys = require('../../config/keys')
const jwt = require('jsonwebtoken')
const passport = require('passport');

const storage = multer.diskStorage({
    // destination:'public/uploads/'+new Date().getFullYear() + (new Date().getMonth()+1) + new Date().getDate(),
    destination(req,res,cb){
        cb(null,'public/uploads/contribute');
    },
    filename(req,file,cb){
        let filenameArr = file.originalname.split('.');
        cb(null,Date.now() + '-' + uuid.v4() + file.originalname.substring(0,file.originalname.indexOf('.')) + '.' + filenameArr[filenameArr.length-1]);
    }
});

const upload = multer({storage});

router.get('/test', (req, res) => {
    res.json({msg: 'comments'})
})


router.post('/upload', (req, res) => {
    res.json({msg: 'success'})
})

// 提交投稿
router.post('/submit', upload.array("file"), passport.authenticate("jwt",{session:false}), (req, res) => {
    const id = uuid.v4()
    const userId = req.body.userId 
    const title = req.body.title 
    const type = req.body.type 
    const content = req.body.content 
    const description = req.body.description 
    const videoLink = req.body.videoLink 
    const downloadLink = req.body.downloadLink 
    const downloadPassword = req.body.downloadPassword 
    const downloadUnzip = req.body.downloadUnzip 
    const size = req.body.size
    const contributeTime = new Date().getTime()

    let imgSrc = []
    req.files.forEach( file => {
        imgSrc.push('/contribute/' + file.filename)
    })
    if( imgSrc.length > 0) {
        imgSrc = JSON.stringify(imgSrc)
    } else {
        imgSrc = null
    }

    console.log(imgSrc)
    console.log(req.body)

    const contributionSql = 'INSERT INTO contribute VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    connection.query(
        contributionSql,
        [id, userId, title, type, content, description, videoLink, imgSrc, downloadLink, size, downloadPassword, downloadUnzip, 0, contributeTime], 
        (err, result) => {
            if(err) {
                console.log(err)
                res.json({ code: 0, msg: '服务器异常，投稿提交失败，请稍后再试。', data: null})
                return
            }
            // 投稿完成
            res.send({ code: 1, msg: '投稿提交成功', data: null})        
        })
})

// 删除投稿
router.post('/delete', passport.authenticate("jwt",{session:false}), (req, res) => {
    const id = req.body.id
    console.log(id)
    let delContSql = 'DELETE FROM contribute WHERE id = ?'
    let delArtiSql = 'DELETE FROM article WHERE id = ?'
    query(delContSql, id)
        .then(result => {
            console.log(result)
            if( result.affectedRows > 0 ) {
                return query(delArtiSql,id)
            } else {
                res.json({ code: 0, msg: '删除投稿失败', data: null})
                return
            }
        })
        .then(result => {
            if( result.affectedRows > 0 ) {
                res.json({ code: 1, msg: '删除投稿与文章成功', data: null})
            } else {
                res.json({ code: 1, msg: '删除投稿成功', data: null})
            }
        })
        .catch(err=>res.json({ code: 0, msg: '服务器异常，删除投稿失败', data: null}))
    function query(sql,...arg) {
        return new Promise((resolve, reject) => {
            connection.query(sql,...arg,(err, result) => {
                if(err) {
                    console.log(err)
                    res.json({code: 0, msg: '服务器异常，删除投稿失败', data: null})
                    reject(err)
                    return
                }
                resolve(result)
            })
        })
    }
})

module.exports = router