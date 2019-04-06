const express = require('express')
const md5 = require('blueimp-md5')
const nodemailer = require('nodemailer');
const svgCaptcha = require('svg-captcha');
const session = require('express-session');



const router = express.Router()

router.use(session({
    secret : '1788-music-com-xiaolong', // 对session id 相关的cookie 进行签名
    resave : true,
    saveUninitialized: false, // 是否保存未初始化的会话
    cookie : {
        maxAge: 1000 * 60 * 15, // 设置 session 的有效时间，单位毫秒 15min
    },
}));

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
        res.send({code: 1, msg: "已发送验证码", data: null})

    });

})

// 验证验证码是否正确
router.post('/verfiyCode', (req, res) => {
    const { email, code } = req.body
    console.log(email,code)
    if( email == req.session.email && code === req.session.code ) {
        res.send({ code: 1, msg: '验证验证码成功', data: null})
        return
    }
    console.log(req.session.email, req.session.code)

    res.send({ code: 0, msg: '验证验证码失败', data: null})
})




module.exports = router