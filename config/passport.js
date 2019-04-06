const JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt;
    const keys = require("../config/keys");

const opts = {}

//通过配置信息来生成jwt的请求，验证这个token
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();  

opts.secretOrKey = keys.secretOrKey;
 
module.exports = passport => {
    passport.use(new JwtStrategy(opts, (jwt_payload, done) => {
        console.log(jwt_payload);
        done(null, jwt_payload.id)
    }));
  }