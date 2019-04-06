const express = require('express')
const router = express.Router()
const md5 = require('blueimp-md5')
const uuid = require('node-uuid')
const passport = require('passport');
const mysql = require('mysql');
const connection = require('../../connection.js') //引入连接数据库模块
// 连接mysql
router.get('/test', (req, res) => {
    res.json({msg: 'home'})
})

// 查询是否设置密保
router.post("/getProtect", passport.authenticate("jwt",{session:false}),(req, res) => {
    const email = req.body.email
    connection.query('SELECT count(id) as count FROM safe WHERE email = ? limit 1',
      [email],
      (err, result) => {
        if(err) {
            console.log(err)
            res.json({ code: 0, msg: '服务器异常，获取用户是否设置密保失败', data: null})
            return
        }
        result = result[0]
        res.json({ code: 1, msg: '已获取用户是否设置密保', data: result})
    })
})

// 查询密保问题
router.post("/getQuestion",(req, res) => {
    connection.query('SELECT * FROM encrypted',
      (err, result) => {
        if(err) {
            console.log(err)
            res.json({ code: 0, msg: '服务器异常，获取密保问题失败', data: null})
            return
        }
        res.json({ code: 1, msg: '已获取密保问题', data: result})
    })
})
  

// 设置密保问题
router.post("/settingProtect", passport.authenticate("jwt",{session:false}),(req, res) => {
    const email = req.body.email
    const question = req.body.question
    const answer = req.body.answer
    connection.query('INSERT INTO safe VALUES(?,?,?,?)',
      [uuid.v4(),email,question,md5(answer)],
      (err, result) => {
        if(err) {
            console.log(err)
            res.json({ code: 0, msg: '服务器异常，获取密保问题失败', data: null})
            return
        }
        if( result.affectedRows > 0 ) {
            res.send({code: 1 , msg: "设置密保成功", data: null})
        } else {
            res.send({code: 0 , msg: "设置密保失败", data: null})
        }
      }
    )
})

// 验证密保
router.post("/verifyProtect",(req, res) => {
    const question = req.body.question
    const email = req.body.email
    const answer = req.body.answer
    connection.query('SELECT count(id) as count FROM safe WHERE email = ? and question = ? and answer = ? limit 1',
    [email,question,md5(answer)],
      (err, result) => {
        if(err) {
            res.json({ code: 0, msg: '服务器异常，验证密保失败', data: null})
            console.log(err)
            return
        }
        result = result[0]
        if( result.count > 0 ) {
            res.send({code: 1 , msg: "验证密保成功", data: null})
        } else {
            res.send({code: 0 , msg: "验证密保失败", data: null})
        }
      }
    )
  })
  
  // 更新密保
router.post("/updataProtect", passport.authenticate("jwt",{session:false}),(req, res) => {
    const question = req.body.question
    const email = req.body.email
    const answer = req.body.answer
    connection.query('UPDATE safe SET question = ? , answer = ? where email = ?',
    [question,md5(answer),email],
      (err, result) => {
        if(err) {
            res.json({ code: 0, msg: '服务器异常，验证密保失败', data: null})
            console.log(err)
            return
        }

        if( result.affectedRows > 0 ) {
            res.send({code: 1 , msg: "更新密保成功", data: null})
        } else {
            res.send({code: 0 , msg: "更新密保失败", data: null})
        }
  
      }
    )
  })

//  修改密码
router.post('/updatePassword', (req, res) => {
    const { email, newpwd } = req.body
    console.log(email, newpwd)
    let password = newpwd
    password = md5(md5(password))
    connection.query('UPDATE users SET password = ? WHERE email = ? ', [password, email], (err, result) => {
        if(err) {
            res.json({ code: 0, msg: '服务器异常，验证密保失败', data: null})
            console.log(err)
            return
        }
        res.json({ code: 1, msg: '密码已重新设置', data: null})
    })
})

// 查询邮箱是否存在
router.post('/emailIsExit', (req, res) => {
    const { email } = req.body
    connection.query('SELECT * FROM users WHERE email = ?',[email],(err,result)=> {
        if(err) {
            res.json({ code: 0, msg: '服务器异常，验证密保失败', data: null})
            console.log(err)
            return
        }
        console.log(result)
        if(result.length>0) {
            res.json({ code: 1, msg: '邮箱存在可以发送验证码', data: null})
        } else {
            res.json({ code: 0, msg: '请输入已注册的邮箱', data: null})
        }
    })
})
module.exports = router