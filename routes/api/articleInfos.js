const express = require('express')
const router = express.Router()
const mysql = require('mysql');
const connection = require('../../connection.js') //引入连接数据库模块
// 连接mysql
router.get('/test', (req, res) => {
    res.json({msg: 'home'})
})

// 根据id获取文章详情数据
router.post('/', (req, res) => {
    const id = req.body.id
    console.log(id)

    // 查询文章sql
    let dataSql = 'SELECT a.*,u.nickname as nickname FROM article a LEFT JOIN users u ON a.issuer = u.id WHERE a.id = ?'

    // 更新look sql
    let lookSql = 'UPDATE article SET look = look + 1 WHERE id = ?'
    // 调用封装函数

    getData(dataSql, id)
        .then(article => {
            if ( article.length < 1 ) {
                res.send({ code: 0, msg: "获取数据失败", data: null});
                return
            }
            article = article[0]
            res.send({ code: 1, msg: "获取数据成功", data: article});
            updateLook(lookSql, id)
        })
        .then( isUpdate => {
            console.log(111)
        })
        .catch(err => res.send({ code: 0, msg: "获取数据失败", data: null}))
    
    
    //   封装获取具体id文章数据
    function getData(sql, id) {
        return new Promise((resolve, reject) => {
            connection.query(sql,[id],(err, result) => {
                if(err) {
                    res.send({ code: 0, msg: "获取数据失败", data: null});
                    console.log(err)
                    reject(err)
                    return
                }
                resolve(result)
            })
        })
    }

    //   封装更新look数函数 
    function updateLook(sql, id) {
        return new Promise((resolve, reject) => {
            connection.query(sql,[id],(err, result) => {
                if(err) {
                    res.send({ code: 0, msg: "获取数据失败", data: null});
                    console.log(err)
                    reject(err)
                    return
                }
                resolve(result)
            })
        })
    }
})
  

module.exports = router