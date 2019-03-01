const express = require('express')
const router = express.Router()
const mysql = require('mysql');
const connection = require('../../connection.js') //引入连接数据库模块
// 连接mysql
router.get('/test', (req, res) => {
    res.json({msg: 'home'})
})

// ------------homeData---------------
router.post('/homeData',function(req, res) {
    
    let homeData = []

    let type = ['synthesizer','effects','samplePack','tutorial','host','project','kontakt','preset','midi','%%']
    // 获取首页数据
    
    type.forEach((item,index) => {
        getHomeData(item)
        // 0 synthesizer
        .then(item => {
            homeData.push(item)
            if( index+1 == type.length) {
                res.send({ code: 1, msg: "获取数据成功", data: homeData})
            }
        })
        .catch( error => {
            res.send({ code: 0, msg: "获取数据失败", data: null})
        })
    })

    // 获取首页数据函数封装
    function getHomeData(type){
        return new Promise((resolve,reject) => {
            connection.query(`SELECT id,title,content,img,releaseTime,type FROM article where type like "${type}" order by releaseTime desc limit 0,10`,(err, type) => {
            if(err){
                console.log(err)
                reject(err)
                return
            }
            resolve(type)
            })
        })
    }
    
  
})
  

module.exports = router