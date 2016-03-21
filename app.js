// import modules
var express         = require('express');
var app             = express();
var path            = require('path');
var mongoose        = require('mongoose');
var passport        = require('passport');
var session         = require('express-session');
var flash           = require('connect-flash');
var async           = require('async');
var bodyParser      = require('body-parser');
var methodOverride  = require('method-override');

// connect database
mongoose.connect(process.env.MONGO_DB);
var db = mongoose.connection;
db.once("open", function() {
  console.log("DB connected");
});
db.on("error", function (err) {
  console.log("DB ERROR :", err);
});

// model setting
var postSchema = mongoose.Schema({
  title : {type:String, required:true},
  body: {type:String, required:true},
  createdAt: {type:Date, default:Date.now},
  updateAt: Date
});
// 모델을 담는 변수는 첫긇자가 대문자이어야함
var Post = mongoose.model('post', postSchema);
var bcrypt = require("bcrypt-nodejs"); // 비밀번호를 암호화
var userSchema = mongoose.Schema({
  email : {type:String, required:true, unique:true},
  nickname : {type:String, required:true, unique:true},
  password : {type:String, required:true, unique:true},
  createdAt : {type:Date, default:Date.now}
});
userSchema.pre("save", function(next) { // User모델이 "save"되기 전
  var user = this;
  if(!user.isModified("password")) {
    return next();
  } else {
    user.password = bcrypt.hashSync(user.password);
    return next();
  }
});
userSchema.methods.authenticate = function (password) {
  var user = this;
  return bcrypt.compareSync(password, user.password);
};

var User = mongoose.model('user', userSchema);
/*
var dataSchema = mongoose.Schema({
  name:String,
  count:Number
});
var Data = mongoose.model('data', dataSchema);
Data.findOne({name:"myData"}, function(err, data) {
  if(err) return console.log("Data ERROR :", err);
  if(!data) {
    Data.create({name:"myData", count:0}, function(err, data) {
      if(err) return console.log("Data ERROR :", err);
      console.log("Counter initialized :",data);
    });
  }
});
*/

// view setting
app.set("view engine", 'ejs');

// set middlewares
app.use(express.static(path.join(__dirname, 'public'))); // 정적셋팅
app.use(bodyParser.json()); // 다른프로그램이 JSON으로 데이터 전송할 경우
app.use(bodyParser.urlencoded({extended:true})); // 웹사이트가 JSON으로 데이터를 전송할 경우
app.use(methodOverride("_method"));
app.use(flash());

app.use(session({secret:'MySecret'})); // 비밀번호 Hash키 값
app.use(passport.initialize());
app.use(passport.session());

// session생성 시에 어떠한 정보를 저장할지 결정
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
// session으로 부터 개체를 가져올때 어떻게 가져올지 결정
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// 로그인 인증방식
var LocalStrategy = require('passport-local').Strategy;
passport.use('local-login',
  new LocalStrategy({
      usernameField : 'email',
      passwordField : 'password',
      passReqToCallback : true
    },
    function(req, email, password, done) {
      User.findOne({'email' : email }, function(err, user) {
          if(err) return done(err);
          if(!user) {
            req.flash("email", req.body.email);
            return done(null, false, req.flash('loginError', 'No user found.'));

          }
          if(!user.authenticate(password)) {
            req.flash("email", req.body.email);
            return done(null, false, req.flash('loginError', 'Password does not Match.'));
          }
          return done(null, user);
      });
    }
  )
);

// set routes
/*
app.get('/posts', function(req, res) {
  Post.find({}).sort('-createdAt').exec(function (err,posts) {
    if(err) return res.json({success:false, message:err});
    res.render("posts/index", {data:posts});
  });
}); // index
app.get('/posts/new', function(req, res) {
  res.render("posts/new");
}); // new
app.post('/posts', function(req, res) {
  Post.create(req.body.post, function (err, post) {
    if(err) return res.json({success:false, messgae:err});
    res.redirect('/posts');
  });
}); // create
app.get('/posts/:id', function(req, res) {
  Post.findById(req.params.id, function (err, post) {
    if(err) return res.json({success:false, message:err});
    res.render("posts/show", {data:post});
  });
}); // show
app.get('/posts/:id/edit', function(req, res) {
  Post.findById(req.params.id, function (err, post) {
    if(err) return res.json({success:false, message:err});
    res.render("posts/edit", {data:post});
  });
}); // edit
app.put('/posts/:id', function(req, res) {
  req.body.post.updatedAt=Date.now();
  Post.findByIdAndUpdate(req.params.id, req.body.post, function (err, post) {
    if(err) return res.json({success:false, message:err});
    res.redirect('/posts/'+req.params.id);
  });
}); // update
app.delete('/posts/:id', function(req, res) {
  Post.findByIdAndRemove(req.params.id, function (err, post) {
    if(err) return res.json({success:false, message:err});
    res.redirect('/posts');
  });
}); //destroy
*/
app.get('/', function(req, res) {
  res.redirect('/posts');
});
app.get('/login', function(req, res) {
  res.render('login/login', {email:req.flash("email")[0], loginError:req.flash('loginError')});
});
app.post('/login',
  function (req, res, next) {
    req.flash("email");
    if(req.body.email.length === 0 || req.body.password.length === 0) {
      req.flash("email", req.body.email);
      req.flash("loginError", "Please enther both email and password.");
      req.redirect('/login');
    } else {
      next();
    }
  }, passport.authenticate('local-login', {
    successRedirect : '/posts',
    failureRedirect : '/login',
    failureFlash : true
  })
);
app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});
// set user routes
app.get('/users/new', function(req, res) {
  res.render('users/new', {
    formData : req.flash('formData')[0],
    emailError : req.flash('emailError')[0],
    nicknameError : req.flash('nicknameError')[0],
    passwordError : req.flash('passwordError')[0]
  });
}); // new
app.post('/users', checkUserRegValidation, function(req, res, next) {
  User.create(req.body.user, function(err, user) {
    if(err) return res.json({success:false, message:err});
    res.redirect('/login');
  });
}); // create
app.get('/users/:id', isLoggedIn, function(req, res) {
  User.findById(req.params.id, function(err, user) {
    if(err) return res.json({success:false, message:err});
    res.render('users/show', {user: user});
  });
}); // show
app.get('/users/:id/edit', isLoggedIn, function(req, res) {
  if(req.user._id != req.params.id) return res.json({success:false, message:"Unauthrized Attempt"});
  User.findById(req.params.id, function(err, user) {
    if(err) return res.json({success:false, message:err});
    res.render("users/edit", {
      user:user,
      formData : req.flash('formData')[0],
      emailError : req.flash('emailError')[0],
      nicknameError : req.flash('nicknameError')[0],
      passwordError : req.flash('passwordError')[0]
    });
  });
}); // edit
app.put('/users/:id', isLoggedIn, checkUserRegValidation, function(req, res) {
  if(req.user._id != req.params.id) return res.json({success:false, message:"Unauthrized Attempt"});
  User.findById(req.params.id, req.body.user, function(err, user) {
    if(err) return res.json({success:"false", message:err});
    if(user.authenticate(req.body.user.password)) {
      if(req.body.user.newPassword) {
        user.password = req.body.user.newPassword;
        user.save();
      } else {
        delete req.body.user.password;
      }
      User.findByIdAndUpdate(req.params.id, req.body.user, function(err, user) {
        if(err) return res.json({success:"false", message:err});
        res.redirect('/users/'+req.params.id);
      });
    } else {
      req.flash("formData", req.body.user);
      req.flash("passwordError", "- Invalid password");
      res.redirect('/users/'+req.params.id +"/edit");
    }
  });
}); // update
app.get('/posts', function(req, res) {
  Post.find({}).sort('-createdAt').exec(function (err, posts) {
    if(err) return res.json({success:false, message:err});
    res.render("posts/index", {data:posts, user:req.user});
  });
}); // index

// start server
app.listen(3000, function() {
  console.log('Server On!');
});

// functions
// 현재 로그인이 되어 있는 상태를 판단
function isLoggedIn(req, res, next) {
  if(req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}
// 유저를 새로 등록하거나 유저 정보를 변경하기 전에 DB에 email이 이미 등록되어 있는지,
// nickname이 이미 등록되어있는지를 찾아보고 결과가 있으면 에러 메시지 출력
function checkUserRegValidation(req, res, next) {
    var isVaild = true;
    // 비동기함수를 동기함수처럼 사용
    async.waterfall (
      [function(callback) {
        User.findOne({email: req.body.user.email, _id: {$ne: mongoose.Types.ObjectId(req.params.id)}},
          function(err, user) {
            if(user) {
              isVaild = false;
              req.flash("emailError", "- This email is already resistered.");
            }
            callback(null, isVaild);
          }
      );
    }, function(isVaild, callback) {
      User.findOne({nickname : req.body.user.nickname, _id: {$ne: mongoose.Types.ObjectId(req.params.id)}},
        function(err, user) {
          if(user) {
            isVaild = false;
            req.flash("nicknameError", "- This nickname is already resistered. ");
          }
          callback(null, isVaild);
        }
      );
    }], function(err, isVaild) {
      if(err) return res.json({success:"false", message:err});
      if(isVaild) {
        return next();
      } else {
        req.flash("formData", req.body.user);
        res.redirect("back");
      }
    }
  );
}



/*
app.get('/', function (req, res) {
  Data.findOne({name:"myData"}, function(err, data) {
    if(err) return console.log("Data ERROR:", err);
    data.count++;
    data.save(function (err) {
      if(err) return console.log("Data ERROR:", err);
      res.render('my_first_ejs', data);
    });
  });
});
app.get('/reset', function (req, res) {
  setCounter(res, 0);
});
app.get('/set/count', function (req, res) {
  if(req.query.count) setCounter(res, req.query.count);
  else getCounter(res);
});
app.get('/set/:num', function (req, res) {
  if(req.params.num) setCounter(res, req.params.num);
  else getCounter(res);
});

function setCounter(res, num) {
  console.log("setCounter");
  Data.findOne({name:"myData"}, function(err, data) {
    if(err) return console.log("Data ERROR:", err);
    data.count = num;
    data.save(function (err) {
      if(err) return console.log("Data ERROR:", err);
      res.render('my_first_ejs', data);
    });
  });
}

function getCounter(res) {
  console.log("getCounter");
  Data.findOne({name:"myData"}, function(err, data) {
    if(err) return console.log("Data ERROR :", err);
    res.render('my_first_ejs', data);
  });
}
*/
