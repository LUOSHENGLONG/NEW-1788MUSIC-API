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

router.get('/test', (req, res) => {
    res.json({msg: 'comments'})
})

const storage = multer.diskStorage({
    // destination:'public/uploads/'+new Date().getFullYear() + (new Date().getMonth()+1) + new Date().getDate(),
    destination(req,res,cb){
      cb(null,'public/uploads/avatar');
    },
    filename(req,file,cb){
      let filenameArr = file.originalname.split('.');
      cb(null,Date.now() + '-' + uuid.v4() + file.originalname.substring(0,file.originalname.indexOf('.')) + '.' + filenameArr[filenameArr.length-1]);
    }
  });
  
const upload = multer({storage});
// 多文件上传
// app.use(upload.array("file"));
// 单文件上传
// app.use(upload.single("file"));

// app.post('/api/',upload.single('file'),(req,res)=>{
//   console.log(req.body);
//   console.log(req.file);
//   res.send(req.file);
// });

router.post('/fileUpload', upload.single("file"), passport.authenticate("jwt",{session:false}), (req, res) => {
    const id = req.body.id
    let filePath = path.join(`./public/uploads/avatar/`+req.file.filename)
    // 读取文件 如果文件能读取到说明头像上传成功
    fs.readFile(filePath, (err, result) => {
        if( err ) {
            console.log(err)
            res.json({ code:0, msg: '服务器异常 fileUpload Failed', data: null})
            return
        }
        
    })
    const uploadSql =  'UPDATE users SET avatar = ? WHERE id = ? limit 1'
    const fromAvatarSql =  'UPDATE replys SET fromAvatar = ? WHERE from_uid = ?'
    const selectSql =  'SELECT * FROM users WHERE id = ? limit 1'

    updateAvatar(uploadSql,[`/avatar/`+req.file.filename, id])
        .then( result => {
            if( result.affectedRows == 0 ) {
                res.json({ code:0, msg: '修改头像失败', data: null})
            } else {
                return updateAvatar(fromAvatarSql,[`/avatar/`+req.file.filename, id])
            }
        })
        .then(result => {
            return updateAvatar(selectSql, [id])
        })
        .then(result => {
            
            fs.unlink(path.join(`./public/uploads/avatar`+req.body.avatar),(err) => {
                if(err) {
                    return console.log(err)
                }
                console.log("头像更新成功且已删除原头像文件")
            })
            console.log(result)
            if(result.length > 0) {
                result = result[0]
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
                
                //  expiresIn为过期时间 单位秒 默认一个小时
                jwt.sign(rule, keys.secretOrKey, { expiresIn: time }, (err, token) => {
                    if (err) throw err
                    // req.session.token = 'Bearer ' + token
                    res.json({ code: 1, msg: '修改头像成功', data: 'Bearer ' + token })
                })
            }
        })

    // 封装更新头像查询
    function updateAvatar(sql, ...arg) {
        return new Promise((resolve, reject) => {
            connection.query(sql, ...arg, (err, result) => {
                if(err) {
                    console.log(err)
                    res.json({ code:0, msg: '服务器异常 fileUpload Failed', data: null})
                    reject(err)
                    return
                }
                resolve(result)
            })
        })
    }
})

module.exports = router