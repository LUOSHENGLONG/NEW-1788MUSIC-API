const express = require('express')
const bodyParser = require('body-parser')
const path = require('path');
const app = express();
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const passport = require("passport");       //引入passport插件
app.use(passport.initialize());     //passport初始化
require("./config/passport")(passport);

app.get('/', (req, res) => {
    res.json({msg: 'success'})
})

const connection = require('./connection.js') //引入连接数据库模块
// 连接mysql
connection.connect();

// 静态资源
app.use(express.static(path.join(__dirname, './public/uploads')));
//解决跨域问题
app.all('*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Content-Length, Authorization,\'Origin\',Accept,X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('X-Powered-By', ' 3.2.1');
    res.header('Content-Type', 'application/json;charset=utf-8');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

const home = require('./routes/api/home.js')
const users = require('./routes/api/users.js')
const articles = require('./routes/api/articles.js')
const articleInfos = require('./routes/api/articleInfos.js')

app.use('/api/home', home)
app.use('/api/articles', articles)
app.use('/api/articleInfos', articleInfos)
app.use('/api/users', users)

app.listen(3006, () => {
    console.log('Server running at 3006 port')
})