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
var Post = mongoose.model('post', postSchema);

var userSchma = mongoose.Schema({
  email : {type:String, required:true, unique:true},
  ninckname : {type:String, required:true, unique:true},
  password : {type:String, required:true, unique:true},
  createdAt : {type:Date, default:Date.now}
});
var User = mongoose.model('user', userSchma);
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
app.use(express.static(path.join(__dirname, 'publuc')));
app.use(bodyParser.json()); // 다른프로그램이 JSON으로 데이터 전송할 경우
app.use(bodyParser.urlencoded({extended:true})); // 웹사이트가 JSON으로 데이터를 전송할 경우
app.use(methodOverride("_method"));
app.use(flash());

app.use(session({secret:'MySecret'})); // 비밀번호 Hash키 값
app.use(passport.initialized());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

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
          if(user.password != password) {
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
  function (reqm res, next) {
    req.flash("email");
    
  })
// start server
app.listen(3000, function() {
  console.log('Server On!');
});

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
