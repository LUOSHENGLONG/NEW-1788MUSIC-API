const express = require('express')
const router = express.Router()
const connection = require('../../connection.js') //引入连接数据库模块

router.get('/test', (req, res) => {
    res.json({msg: 'home'})
})

// ------------articleData---------------
router.get('/articleData',function(req, res) {
    let type = req.query.type
    let page_index = req.query.page_index
    let page_size = req.query.page_size
    let search = req.query.search

    if( type == undefined || type == null) {
        res.send({ code: 0, msg: "获取数据失败", data: null});
        return
    }

    if( page_index == undefined || page_index == null) {
        res.send({ code: 0, msg: "获取数据失败", data: null});
        return
    }

    if( page_size == undefined || page_size == null) {
        res.send({ code: 0, msg: "获取数据失败", data: null});
        return
    }
    if( search == undefined || search == null ) {
        res.send({ code: 0, msg: "获取数据失败", data: null});
        return
    }

    if( search == 'null') {
        search = ''
    }

    
    
    // 数据优化
    search = `%${search}%`
    page_index = parseInt(req.query.page_index)
    page_size = parseInt(req.query.page_size)

    // 查询总数sql
    let countSql = 'SELECT count(id) FROM article WHERE type = ? AND title like ?'

    // 查询数据sql
    let dataSql = `SELECT a.content,a.img,a.type,a.description,a.id,a.size,a.releaseTime,a.title,u.nickname as nickname FROM article a LEFT JOIN users u ON a.issuer = u.id WHERE a.type = ? AND a.title like ? ORDER BY a.releaseTime desc limit ?,?`

    // 判断是否 type 为last 最新
    if( type == 'last') {
        countSql = 'SELECT count(id) FROM article WHERE title like ?'
        dataSql = `SELECT a.content,a.img,a.type,a.description,a.id,a.size,a.releaseTime,a.title,u.nickname as nickname FROM article a LEFT JOIN users u ON a.issuer = u.id WHERE a.title like ? ORDER BY a.releaseTime desc limit ?,?`
        // 先查询总条数 
        getArtcileCount(countSql, search, search)
        .then(count => {
            count = count['count(id)']
            // 总条数为0 则return
            if( count == 0) {
                res.send({ code: 0, msg: "查询数据结果为空", data: null});
                return
            }
            getArtcileData(dataSql, search, (page_index-1)*page_size, page_size)
            .then( data => {
                // console.log(data.length)
                // data.length = 0 查询结果为空
                if( data.length == 0 ) {
                    res.send({ code: 0, msg: "查询数据结果为空", data: null});
                } else {
                    res.send({ code: 1, msg: "获取数据成功", data: data, totalCount: count})
                }
            })
        })
    } else {
        // 先查询总条数 
        getArtcileCount(countSql, search)
        .then(count => {
            count = count['count(id)']
            // 总条数为0 则return
            if( count == 0) {
                res.send({ code: 0, msg: "查询数据结果为空", data: null});
                return
            }
            
            getArtcileData(dataSql, type, search, (page_index-1)*page_size, page_size)
            .then( data => {
                // console.log(data.length)
                // data.length = 0 查询结果为空
                if( data.length == 0 ) {
                    res.send({ code: 0, msg: "查询数据结果为空", data: null});
                } else {
                    res.send({ code: 1, msg: "获取数据成功", data: data, totalCount: count})
                }
            })
        })
    }
    

    // 获取总数 arg1 > sql arg2 > type
    function getArtcileCount(url, type, search) {
        return new Promise((resolve, reject) => {
            connection.query(url,[type, search], (err, result) => {
                if(err) {
                    res.send({ code: 0, msg: "获取数据失败", data: null});
                    console.log(err)
                    reject(err)
                    return
                }
                resolve(result[0])
            })
        })
    }

    // 获取数据 arg1 > sql arg2 > type arg3 > search arg4 > pageIndex arg4 > pageSize
    function getArtcileData(url, type, search, pageIndex, pageSize) {
        return new Promise((resolve, reject) => {
            connection.query(url,[type, search, pageIndex, pageSize], (err, result) => {
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