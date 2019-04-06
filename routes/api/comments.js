const express = require('express')
const uuid = require('node-uuid')
const router = express.Router()
const connection = require('../../connection.js') //引入连接数据库模块
const passport = require('passport');

router.get('/test', (req, res) => {
    res.json({msg: 'comments'})
})

// 获取该文章的评论数据

router.post('/getComments', (req, res) => {
    const articleId = req.body.articleId

    const commentsSql = 'SELECT c.id,c.topic_id,c.content,c.createTime,c.from_uid,u.avatar,u.nickname FROM comments c LEFT JOIN users u ON c.from_uid = u.id WHERE c.topic_id = ? ORDER BY c.createTime DESC'

    const replysSql = 'SELECT r.comment_id,r.content,r.createTime,r.from_uid,r.fromNickname,r.fromAvatar,r.reply_id,r.reply_type,r.to_uid,u.nickname,u.avatar FROM replys r LEFT JOIN users u ON r.to_uid = u.id WHERE r.comment_id = ? ORDER BY r.createTime DESC'

    let data = {}
    data.comments = []
    getCommentsAndReplys(commentsSql, articleId)
        .then( result => {
            data.comments = result
            return getCommentsAndReplys(replysSql,articleId)
        })
        .then( result => {
            data.replys = result
            res.send({ code: 1, msg: '获取评论回复数据成功', data: data })
        })
        .catch(err => {
            res.send({ code: 0, msg: '服务器异常 getComments Failed', data: null})
        })

    // 封装拿到评论数据
    function getCommentsAndReplys(sql, articleId) {
        return new Promise((resolve, reject) => {
            connection.query(sql,[articleId],(err, result) => {
                if(err) {
                    res.send({ code: 0, msg: '服务器异常 getComments Failed', data: null})
                    reject(err)
                    return
                }
                resolve(result)
            })
        })
    }
    // 封装拿到回复数据
})

// 提交评论
router.post('/sendComment',passport.authenticate("jwt",{session:false}), (req, res) => {
    const id = uuid.v4()
    const topicId = req.body.topicId
    const topicType = req.body.topicType
    const content = req.body.content
    const fromUid = req.body.fromUid
    const createTime = new Date().getTime()
    const like = req.body.like

    connection.query('INSERT INTO comments VALUES(?,?,?,?,?,?,?)',
        [id, topicId, topicType, content, fromUid, createTime, like],
        (err, result) => {
            if(err){
                res.send({ code: 0, msg: '服务器异常 sendcomment Failed', data: null})
                return
            }
            if( result.affectedRows > 0) {
                res.send({ code: 1, msg: '评论成功', data: null})
            }
        })
})

// 提交回复
router.post('/sendReply', passport.authenticate("jwt",{session:false}), (req, res) => {
    const id = uuid.v4()
    const commentId = req.body.commentId
    const replyId = req.body.replyId
    const replyType = req.body.replyType
    const content = req.body.content
    const fromUid = req.body.fromUid
    const fromNickname = req.body.fromNickname
    const fromAvatar = req.body.fromAvatar
    const toUid = req.body.toUid
    const createTime = new Date().getTime()

    const sendSql = 'INSERT INTO replys VALUES(?,?,?,?,?,?,?,?,?,?)'
    const argList = [id, commentId, replyId, replyType, content, fromUid, fromNickname, fromAvatar, toUid, createTime]


    sendReply(sendSql, argList)
        .then( result => {
            if( result.affectedRows > 0) {
                res.json({ code: 1, msg: '评论成功', data: null})
            } else {
                res.json({ code: 0, msg: '评论失败', data: null})
            }
        })
    
    function sendReply(sql,...arg) {
        return new Promise((resolve, reject) => {
            connection.query(sql,...arg,(err, result) => {
                if(err) {
                    res.json({ code: 0, msg: '服务器异常 sendReply Failed', data: null})
                    reject(err)
                    return
                }
                resolve(result)
            }) 
        })
    }
})

module.exports = router