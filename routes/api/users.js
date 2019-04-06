const express = require('express')
const md5 = require('blueimp-md5')
const jwt = require('jsonwebtoken')
const uuid = require('node-uuid')
const connection = require('../../connection.js') //引入连接数据库模块
const keys = require('../../config/keys')
const passport = require('passport');
const nodemailer = require('nodemailer');
const svgCaptcha = require('svg-captcha');
const session = require('express-session');



const router = express.Router()

router.use(session({
    secret : '1788-music-com-xiaolong', // 对session id 相关的cookie 进行签名
    resave : true,
    saveUninitialized: false, // 是否保存未初始化的会话
    cookie : {
        maxAge: 1000 * 60 * 60, // 设置 session 的有效时间，单位毫秒 60min
    },
}));



router.get('/test', (req, res) => {
    res.json({msg: 'user'})
})
// 注册 
router.post('/register', (req, res) => {
    const account = req.body.account
    let password = req.body.password
    const code = req.body.code
    if( code != req.session.code ) {
        res.json({ code:0, msg: '验证码不正确', data: null})
        return
    }
    // 验证邮箱
    const emailConfirm = /^[A-Za-z\d]+([-_.][A-Za-z\d]+)*@([A-Za-z\d]+[-.])+[A-Za-z\d]{2,4}$/
    if( !emailConfirm.test(account) ) {
        res.json({ code: 0, msg: '注册邮箱格式错误', data: null})
        return
    }
    // 验证密码
    const passwordConfirm = /^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z_@!#$%^&*()/]{8,16}$/
    if( !passwordConfirm.test(password)){
        res.json({ code: 0, msg: '密码须包含字母和数字且不能含有某些特殊字符', data: null})
        return
    }
    
    // 创建时间
    let createTime = new Date().getTime()

    //密码加密 第一次
    password = md5(password)
    //密码加密 第二次
    password = md5(password)

    // 随机产生昵称
    function randomWord(randomFlag, min, max){
        let str = "",
            range = min,
            arr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        // 随机产生
        if(randomFlag){
            range = Math.round(Math.random() * (max-min)) + min;
        }
        for(var i=0; i<range; i++){
            pos = Math.round(Math.random() * (arr.length-1));
            str += arr[pos];
        }
        return str;
    }
    // 随机产生6-10位的昵称
    let nickname = randomWord(true,6,10)
    //邮箱验证
    const isExitSql = 'SELECT count(id) as count FROM users WHERE email = ?'
    const insertSql = 'INSERT users(id,user_id,email,password,nickname,createTime) VALUES(?,?,?,?,?,?)'

    query(isExitSql, account)
        .then(count => {
            count = count[0].count
            // 邮箱已被注册
            if( count > 0 ) {
                res.send({ code: 0, msg: '该邮箱已注册', data: null})
                return
            }
            // 可以注册
            return query(insertSql,[uuid.v4(), uuid.v1(), account, password, nickname, createTime])
        })
        .then( result => {
            if( result.affectedRows > 0 ) {
                res.send({ code: 1, msg: '注册成功', data: null})
            } else {
                res.send({ code: 0, msg: '注册失败', data: null})
            }
        })
        .catch( err => {
            console.log(err)
            res.send({ code: 0, msg: '服务器异常，注册失败。', data: null})
        })


    function query(sql, ...arg) {
        return new Promise((resovle, reject) => {
            connection.query(sql, ...arg, (err, result) => {
                if(err) {
                    console.log(err)
                    res.json({ code: 0, msg: '服务器异常，注册失败。', data: null})
                    reject(err)
                    return 
                }
                resovle(result)
            })
        } )
    }
})

// 发送注册邮箱验证码
router.post('/sendQRCode', (req, res) => {
    const email = req.body.email
    // 发送邮件配置
    let transporter = nodemailer.createTransport({
        host: 'smtp.qq.com',
        service: 'qq', // 使用了内置传输发送邮件 查看支持列表：https://nodemailer.com/smtp/well-known/
        port: 465, // SMTP 端口
        secureConnection: true, // 使用了 SSL
        auth: {
            user: 'music1788@qq.com',
            // 这里密码不是qq密码，是你设置的smtp授权码
            pass: 'pvilpkuuwbcyehdd',
        }
    });
    // 生成验证码 6位
    let codeConfig = {
        size: 6, // 验证码长度
        ignoreChars: 'QWERTYUIOPLKJHGFDSAZXCVBNMzxcvbnmlkjhgfdsaqwertyuiop', // 验证码字符中排除
        noise: 2, // 干扰线条的数量
    }
    const captcha = svgCaptcha.create(codeConfig);
    // text是验证码
    const text = captcha.text.toLowerCase()

    console.log(text)

    // 邮件发送模板
    let mailOptions = {
        from: '"1788MUSIC" <music1788@qq.com>', // sender address
        to: email, // list of receivers
        subject: '1788MUSIC 验证码', // Subject line
        // 发送text或者html格式
        // text: 'Hello world?', // plain text body
        html: `<div style="text-align: center;font-size:20px">你的验证码是<h1 style="display: inline-block;color: #6495ED;">${ text }</h1></div>` // html body
    };
    // 发送邮件
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            res.send({code: 0, msg: "服务器异常，发送验证码失败。",data: null})
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        // Message sent: <04ec7731-cc68-1ef6-303c-61b0f796b78f@qq.com>
        req.session.email = email
        req.session.code = text
        res.send({code: 1, msg: "已发送验证码", data: md5(md5(text))})

    });

})

// 验证验证码是否正确
router.post('/verfiyCode', (req, res) => {
    const { email, code } = req.body
    if( email == req.session.email && code === req.session.code ) {
        res.send({ code: 1, msg: '验证验证码成功', data: null})
        return
    }
    console.log(req.session.email, req.session.code)

    res.send({ code: 0, msg: '验证验证码失败', data: null})
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
    // console.log(account)
    // console.log(password)
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

            // console.log(result)
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
                if (err) throw err;
                // 设置 session
                req.session.isLogin = true
                // res.cookie('token', 'Bearer ' + token)
                res.json({ code: 1, msg: '登录成功，欢迎回来!', data: 'Bearer ' + token })
            })
        })
})

// 获取是否登录
router.post('/isLogin', passport.authenticate("jwt",{session:false}), (req, res) => {
    const token = req.body.token
    console.log(token)
    res.send({code:1,msg:'已登录',data: null})

})

// 注销登录
router.post('/logout', (req, res) => {
    req.session.isLogin = false
    res.json({ code:1 , msg: '注销成功', data: null})
})

// 修改昵称
router.post('/updateNickname', passport.authenticate("jwt",{session:false}), (req, res) => {
    const nickname = req.body.nickname
    const id = req.body.id

    const isExistSql = 'SELECT count(id) as count FROM users where nickname = ? limit 1'
    const updateSql = 'UPDATE users SET nickname = ? where id = ?'
    const selectSql = 'SELECT * FROM users WHERE id = ? limit 1'

    // 查询昵称是否存在
    isExistNickname(isExistSql,nickname)
        .then(count => {
            count = count.count
            // console.log(count)
            if( count > 0) {
                res.send({ code: 0, msg: "当前昵称已存在", data: null})
                return
            }
            // 昵称不存在 可以修改
            return updateNickname(updateSql, nickname, id)
        })
        .then(result => {
            // console.log(result)
            if( result.affectedRows > 0) {
                // 更新成功 重新设置token
                return selectUserByNickname(selectSql, id)
                
            } else {
                res.send({ code: 0, msg: "昵称修改失败", data: null})
                return
            }
        })
        .then(user => {
            // console.log(1111111111111111111)
            console.log(user[0])
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
        .catch(err=>res.send({ code: 0, msg: "服务器异常，修改昵称失败", data: null}))
        

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
                resovle(result)
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
router.get('/getAllFavorite', passport.authenticate("jwt",{session:false}), (req, res) => {
    const userId = req.query.userId
    let page_index = parseInt(req.query.page_index)
    let page_size = parseInt(req.query.page_size)
    // console.log(page_index)
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
                // console.log(45)
                // console.log(count)
                return getFavoriteData(dataSql, userId, (page_index-1)*page_size, page_size)
            } else {
                res.send({ code: 1, msg: "收藏数据为空", data: null, totalCount: totalCount})
                return
            }
        })
        .then(data => {
            res.send({ code: 1, msg: "已获取收藏数据", data: data, totalCount: totalCount})
        })
        .catch(err=>{
            console.log(err)
            res.send({ code: 0, msg: "服务器异常 catch error by getContribute", data: null})
        })
    

    // 封装获取收藏数据函数
    function getFavoriteData(sql, userId, pageIndex, pageSize) {
        return new Promise((resovle, reject) => {
            connection.query(sql,[userId,pageIndex,pageSize],(err, result) => {
                if(err) {
                    res.send({ code: 0, msg: "服务器异常，获取收藏数据失败", data: null})
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
                    res.send({ code: 0, msg: "服务器异常，服务器异常，获取收藏数据失败", data: null})
                    console.log(err)
                    reject(err)
                    return 
                }
                resovle(result)
            })
        })
    }
})

// 获取用户投稿 
router.post('/getContribute', passport.authenticate("jwt",{session:false}), (req, res) => {
    const id = req.body.id
    const page_index = parseInt(req.body.pageIndex)
    const page_size = parseInt(req.body.pageSize)

    const countSql = 'SELECT COUNT(id) as count FROM contribute where userId = ?'
    const dataSql = 'SELECT * FROM contribute  WHERE userId = ? ORDER BY contributeTime DESC limit ?,?'

    let totalCount = 0;
    getTotalCount(countSql, id)
        .then(count => {
            count = count[0]
            // 如果总数大于0 则有收藏数据
            if(count.count > 0) {
                totalCount = count.count
                // console.log(count.count)
                return getContributeData(dataSql, id, (page_index-1)*page_size, page_size)
            } else {
                res.send({ code: 1, msg: "投稿数据为空", data: null, totalCount: totalCount})
                return
            }
        })
        .then(data => {
            res.send({ code: 1, msg: "已获取投稿数据", data: data, totalCount: totalCount})
        })
        .catch(err=>{
            console.log(err)
            res.send({ code: 0, msg: "服务器异常 catch error by getContribute", data: null})
        })

    // 封装获取投稿数据函数
    function getContributeData(sql, userId, pageIndex, pageSize) {
        return new Promise((resovle, reject) => {
            connection.query(sql,[userId,pageIndex,pageSize],(err, result) => {
                if(err) {
                    // console.log('xxxxxxxxxx')
                    res.send({ code: 0, msg: "服务器异常，获取投稿数据失败", data: null})
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
                    res.send({ code: 0, msg: "服务器异常,获取投稿数据失败", data: null})
                    console.log(err)
                    reject(err)
                    return 
                }
                resovle(result)
            })
        })
    }

})

// 添加收藏
router.post('/addFavorite', passport.authenticate("jwt",{session:false}), (req, res) => {
    const id = uuid.v4()
    const articleId = req.body.articleId
    const userId = req.body.userId
    const createTime = new Date().getTime()
    const isExistSql = 'SELECT * FROM favorite WHERE articleId = ? and userId = ?'
    const addSql = 'INSERT INTO favorite VALUES(?,?,?,?)'
    if( userId == null || articleId == null) return;
    isAlreadyFavorite(isExistSql, articleId, userId)
        .then(count => {
            if( count.length > 0 ) {
                return
            } else {
                return addFavorite(addSql, id, articleId, userId, createTime)
            }
            
        })
        .then( result => {
            if( result != undefined) {
                res.send({ code: 1, msg: "收藏文章成功", data: null})
            }
        })
        .catch(err=>{
            console.log(err)
            res.send({ code: 0, msg: "服务器异常 catch error by addFavorite", data: null})
        })

    // 封装查询文章是否已收藏
    function isAlreadyFavorite(sql, articleId, userId) {
        return new Promise((resovle, reject) => {
            connection.query(sql, [articleId, userId], (err, result) => {
                if(err) {
                    console.log(err)
                    res.send({ code: 0, msg: "服务器异常,添加收藏失败 isAlreadyFavorite Failed", data: null})
                    reject(err)
                    return
                }
                resovle(result)
            })
        })
    }

    // 封装添加
    function addFavorite(sql, id, articleId, userId, createTime) {
        return new Promise((resovle, reject) => {
            connection.query(sql, 
                [id, articleId, userId, createTime],
                (err, result) => {
                    if(err) {
                        console.log(err)
                        reject(err)
                        res.json({ code: 1, msg: '添加收藏失败', data: null})
                        return
                    }
                    resovle(result)
                })
        })
    }
})

// 取消收藏
router.post('/cancelFavorite', passport.authenticate("jwt",{session:false}), (req, res) => {
    const articleId = req.body.articleId
    const userId = req.body.userId

    const isExistSql = 'SELECT * FROM favorite WHERE articleId = ? and userId = ?'
    const removeSql = 'DELETE FROM favorite WHERE articleId = ? and userId = ?'

    isAlreadyFavorite(isExistSql, articleId, userId)
        .then(count => {
            if( count.length == 0 ) {
                return
            } else {
                return cancelFavorite(removeSql, articleId, userId)
            }
            
        })
        .then( result => {
            if( result != undefined) {
                res.send({ code: 1, msg: "取消收藏文章成功", data: null})
            }
        })
        .catch(err=>{
            console.log(err)
            res.send({ code: 0, msg: "服务器异常 catch error by cancelFavorite", data: null})
        })

    // 封装查询文章是否已收藏
    function isAlreadyFavorite(sql, articleId, userId) {
        return new Promise((resovle, reject) => {
            connection.query(sql, [articleId, userId], (err, result) => {
                if(err) {
                    console.log(err)
                    res.send({ code: 0, msg: "服务器异常,添加收藏失败 cancelFavorite Failed", data: null})
                    reject(err)
                    return
                }
                resovle(result)
            })
        })
    }

    // 封装添加
    function cancelFavorite(sql, articleId, userId) {
        return new Promise((resovle, reject) => {
            connection.query(sql, 
                [articleId, userId],
                (err, result) => {
                    if(err) {
                        console.log(err)
                        reject(err)
                        res.send({ code: 0, msg: "服务器异常,添加收藏失败 cancelFavorite Failed", data: null})
                        return
                    }
                    resovle(result)
                })
        })
    }
})

// 查看该文章用户是否收藏
router.post('/isFavorite', passport.authenticate("jwt",{session:false}), (req, res) => {
    const userId = req.body.userId
    const articleId = req.body.articleId
    // console.log('articleId,userId')
    // console.log(articleId,userId)
    connection.query('SELECT COUNT(id) as count FROM favorite WHERE articleId = ? and userId = ?',
        [articleId, userId],
        (err, result) => {
            if(err) {
                console.log(err)
                res.json({ code: 0, msg: '服务器异常 error by isFavorite', data: null})
                return
            }
            console.log(result)
            res.send({ code: 1, msg: '获取用户是否收藏该文章成功', data: result[0].count})
        })
})

// 反馈提交
router.post('/sendFeedback', (req, res) => {
    const id = uuid.v4()
    const userId = req.body.userId
    const title = req.body.title
    const content = req.body.content
    let createTime = new Date().getTime()
    connection.query("INSERT INTO feedback VALUES(?,?,?,?,?)",
    [id,userId,title,content,createTime],
    (err, result) => {
        if(err) {
            res.send({code: 0, msg: "服务器异常，发送反馈失败", data: null})
            console.log(err)
            return
        }
        res.send({code: 1, msg: "发送反馈成功", data: result})
    })
})



//验证token
router.get("/current",passport.authenticate("jwt",{session:false}),(req,res) => {
    // 如果passport是done(null,user) 即返回回来的是查询的用户信息。则res.send，否则箭头函数不执行
    res.json({success:true});
})



module.exports = router