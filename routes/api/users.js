const express = require('express')
const md5 = require('blueimp-md5')
const jwt = require('jsonwebtoken')
const uuid = require('node-uuid')
const connection = require('../../connection.js') //引入连接数据库模块
const keys = require('../../config/keys')
const passport = require('passport');


const router = express.Router()

router.get('/test', (req, res) => {
    res.json({msg: 'user'})
})

// 登录
router.post('/login', (req, res) => {
    let account = req.body.account
    let password = req.body.password

    const phoneConfirm = new RegExp("(^1[3,4,5,6,7,9,8][0-9]{9}$|14[0-9]{9}|15[0-9]{9}$|18[0-9]{9}$)")
    const emailConfirm = /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/

    // 验证账户是邮箱还是手机
    let sqlName = ""

    if( emailConfirm.test(account)){
        sqlName = `email`
        // console.log("邮箱")
    }else if(phoneConfirm.test(account)){
        sqlName = `phone`
        // console.log("手机")
    }else {
        return res.send({ code: 0, msg: '登录账户格式错误', data: null})
    }

    //密码加密 第一次
    password = md5(password)
    //密码加密 第二次
    password = md5(password)

    // 查询数据库
    console.log(account)
    console.log(password)
    connection.query(
        `SELECT * FROM users where ${sqlName} = ? and password = ? limit 1`,
        [account, password],
        (err, result) => {
            if(err) return res.send({ code: 0, msg: "服务器异常，登录失败", data: null});

            // 如果账号 密码不匹配
            if ( result.length < 1 ) {
                return res.send({ code: 0, msg: "登录账户密码错误,请重新登录", data: null})
            }
            result = result[0]

            console.log(result)
            // jwt规则
            const rule = {
                id: result.id,
                nickname: result.nickname,
                email:result.email,
                createTime:result.createTime,
                avatar: result.avatar,
            }
            // 设置token过期时间默认一个小时
            let time = 3600
            if(req.body.isAutoLogin){
                // 如果设置自动登录折设置过期时间为15天
                time = 3600 * 24 *15
            }
            //  expiresIn为过期时间 单位秒 默认一个小时
            jwt.sign(rule, keys.secretOrKey, { expiresIn: time }, (err, token) => {
                if (err) throw err
                res.json({ code: 1, msg: '登录成功，欢迎回来!', data: 'Bearer ' + token })
            })
        })
})

// 修改昵称
router.post('/updateNickname', (req, res) => {
    const nickname = req.body.nickname
    const id = req.body.id

    const isExistSql = 'SELECT count(id) as count FROM users where nickname = ? limit 1'
    const updateSql = 'UPDATE users SET nickname = ? where id = ?'
    const selectSql = 'SELECT * FROM users WHERE nickname = ? limit 1'

    // 查询昵称是否存在
    isExistNickname(isExistSql,nickname)
        .then(count => {
            if( count > 0) {
                res.send({ code: 0, msg: "当前昵称已存在", data: null})
            }
            // 昵称不存在 可以修改
            return updateNickname(updateSql, nickname, id)
        })
        .then(result => {
            if( result.affectedRows > 0) {
                // 更新成功 重新设置token
                return selectUserByNickname(selectSql, nickname)
                
            } else {
                res.send({ code: 0, msg: "昵称修改失败", data: null})
            }
        })
        .then(user => {
            // console.log(1111111111111111111)
            // console.log(user[0])
            user = user[0]
            // jwt规则
            const rule = {
                id: user.id,
                nickname: user.nickname,
                email:user.email,
                createTime:user.createTime,
                avatar: user.avatar,
            }
            // 设置token过期时间默认一个小时
            let time = 3600
            
            //  expiresIn为过期时间 单位秒 默认一个小时
            jwt.sign(rule, keys.secretOrKey, { expiresIn: time }, (err, token) => {
                if (err) throw err
                res.json({ code: 1, msg: '昵称修改成功!', data: 'Bearer ' + token })
            })

        })
        .catch(err=>res.send({ code: 0, msg: "服务器异常", data: null}))
        

    // 封装昵称是否存在函数 arg1 sql arg2 nickname
    function isExistNickname(sql, nickname) {
        return new Promise((resovle, reject) => {
            connection.query(sql,[nickname], (err, result) => {
                if(err) {
                    reject(err)
                    res.send({ code: 0, msg: "服务器异常", data: null})
                    return 
                }
                resovle(result[0])
            })
        })
    }

    function updateNickname(sql, nickname, id) {
        return new Promise((resovle, reject) => {
            connection.query(sql,[nickname,id], (err, result) => {
                if(err) {
                    reject(err)
                    res.send({ code: 0, msg: "服务器异常", data: null})
                    return 
                }
                return resovle(result)
            })
        })
    }

    function selectUserByNickname(sql,nickname) {
        return new Promise((resovle,reject) => {
            connection.query(sql,[nickname],(err,result) => {
                if(err) {
                    reject(err)
                    res.send({ code: 0, msg: "服务器异常", data: null})
                    return 
                }
                resovle(result)
            })
        })
    }
})

// 获取收藏数据
router.get('/getAllFavorite', (req, res) => {
    const userId = req.query.userId
    let page_index = parseInt(req.query.page_index)
    let page_size = parseInt(req.query.page_size)
    console.log(page_index)
    const countSql = 'SELECT count(id) as count FROM favorite  WHERE userId = ?'
    const dataSql = 'SELECT a.*,f.userId FROM favorite f LEFT JOIN article a ON f.articleId = a.id WHERE f.userId = ? ORDER BY f.createTime DESC limit ?,?'

    // 查询收藏总条数
    let totalCount = 0;
    getTotalCount(countSql, userId)
        .then(count => {
            count = count[0]
            // 如果总数大于0 则有收藏数据
            if(count.count > 0) {
                totalCount = count.count
                console.log(45)
                console.log(count)
                return getFavoriteData(dataSql, userId, (page_index-1)*page_size, page_size)
            } else {
                res.send({ code: 0, msg: "收藏数据为空", data: null})
                return
            }
        })
        .then(data => {
            res.send({ code: 1, msg: "已获取收藏数据", data: data, totalCount: totalCount})
        })
        .catch(err=>res.send({ code: 0, msg: "服务器异常", data: null}))
    

    // 封装获取收藏数据函数
    function getFavoriteData(sql, userId, pageIndex, pageSize) {
        return new Promise((resovle, reject) => {
            connection.query(sql,[userId,pageIndex,pageSize],(err, result) => {
                if(err) {
                    res.send({ code: 0, msg: "服务器异常", data: null})
                    console.log(err)
                    reject(err)
                    return 
                }
                resovle(result)
            })
        })
    }

    // 封装获取收藏总数函数
    function getTotalCount(sql, userId) {
        return new Promise((resovle, reject) => {
            connection.query(sql,[userId],(err, result) => {
                if(err) {
                    res.send({ code: 0, msg: "服务器异常", data: null})
                    console.log(err)
                    reject(err)
                    return 
                }
                resovle(result)
            })
        })
    }
})






//验证token
router.get("/current",passport.authenticate("jwt",{session:false}),(req,res) => {
    // 如果passport是done(null,user) 即返回回来的是查询的用户信息。则res.send，否则箭头函数不执行
    res.json({success:true});
})



module.exports = router