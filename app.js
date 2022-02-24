const md5 = require('md5');
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cors=require('cors');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var indexRouter = require('./routes/index');
var ajaxRouter = require('./routes/ajax');
var session = require('express-session')
const db= require('./business/database');
var MySQLStore = require('express-mysql-session')(session);
const options={
  host: "localhost",
  user: "root",
  port: 3306,
  password: "password",
  database: 'coda',
  checkExpirationInterval: 5*60*1000,
  expiration: 60*60*24*2,
} 
var sessionStore = new MySQLStore(options);
if(!global.sessionStore){
  global.sessionStore=sessionStore;
}

const fs=require('fs')
//var somur = require('./business/s')
//somur.run(); 


//img file size

function imgSize(){
  var fsUtils = require("nodejs-fs-utils");
  fsUtils.fsize("./public/games", {
    symbolicLinks : false
  }, function (err, size) {
      function formatBytes(a,b=2,k=1024){with(Math){let d=floor(log(a)/log(k));return 0==a?"0 Bytes":parseFloat((a/pow(k,d)).toFixed(max(0,b)))+" "+["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"][d]}}
      global.gameImagesSize=formatBytes(size)
      var dt = new Date();
      global.gameImagesSizeDate=`${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}  ${(dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')}/${dt.getFullYear().toString().padStart(4, '0')}`;
      console.log(size)
  });
}
//setInterval(imgSize, 1000*60*60)
//setTimeout(imgSize,5000)



var app = express();
app.use(cors())
app.use(express.json({limit: '200mb'}));
app.use(express.urlencoded({limit: '200mb', extended: false}));

//app.use(express.json());
//app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {
  flags: 'a'
})

app.use(logger(function (tokens, req, res) {
  bodyBlocker=false
  if(req.url.search("/linkedin") != -1 ||  req.url.search("/preview") != -1 || req.url.search("/prototype") != -1 ) 
  {
    bodyBlocker=true
  }
  var u;
  try { u= decodeURIComponent(tokens.url(req, res)) } catch (error) { u=tokens.url(req, res) }
  return [
    (req.session && req.session.user && req.session.user.id + " " +req.session.user.username) || "anonymus",
    tokens.method(req, res),
    u,
     '-',
     bodyBlocker ? "Big-Data" : JSON.stringify(req.body),
    new Date(),
    req.connection.remoteAddress
  ].join(' ')
}, {
  skip: function (req, res) {
    return req.url.search("fonts") != -1 || req.url.search("stylesheets") != -1 || req.url.search("javascripts") != -1 || req.url.search("images") != -1 || req.url.search("games") != -1 || req.url.search("/login") != -1
  }
  ,stream: accessLogStream
}));
app.use(logger(function (tokens, req, res) {
  bodyBlocker=false
  if(req.url.search("/linkedin") != -1 || req.url.search("/preview") != -1 || req.url.search("/prototype") != -1 ) 
  {
    bodyBlocker=true
  }
  var u;
  try { u= decodeURIComponent(tokens.url(req, res)) } catch (error) { u=tokens.url(req, res) }
  return [
    (req.session && req.session.user && req.session.user.id + " " +req.session.user.username) || "anonymus",
    tokens.method(req, res),
    u,
     '-',
     bodyBlocker ? "Big-Data" : JSON.stringify(req.body),
    new Date(),
    req.connection.remoteAddress
  ].join(' ')
}, {
  skip: function (req, res) {
    return req.url.search("fonts") != -1 || req.url.search("stylesheets") != -1 || req.url.search("javascripts") != -1 || req.url.search("images") != -1 || req.url.search("games") != -1 || req.url.search("/login") != -1
  },
}));

//session
app.use(session({
  secret: 'secret wisdom',
  resave: true,
  store: sessionStore,
  saveUninitialized: true,
  cookie: { secure: false,maxAge: (30 * 86400 * 1000) },
}))
if (app.get('env') === 'development') {
  app.locals.pretty = true;
}

//cache
let setCache = function (req, res, next) {
  const period = 84600
  try {
    if(["/fonts","/games","/images","/javascripts","/stylesheets", "/favicon.ico","/prototip_files"].filter(x=> req.url.indexOf(x)==0  ).length){
      res.set('Cache-control', `public, max-age=${period}`)
    }
  } catch (error) {
    
  }
  next()
}
app.use(setCache)
//app.use('/favicon.ico', express.static('images/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');


app.use(async function (req, res, next) {
  try {
    if(req.session.user.message){
      res.locals.message=req.session.user.message
      delete req.session.user.message
    }
  } catch (error) {
    
  }
 
  if ( req.url.indexOf("/login")==0 || req.url.indexOf("/ajax/linkedin")==0 || req.url.indexOf("/ajax/login")==0 || req.url.indexOf("/register")==0 || req.url.indexOf("/ajax/register")==0 ) { 
    if(req.session.user && req.session.user.approved){
      res.redirect('/dashboard');
    }
    else{
      next(); 
    }
    
  }
  else if(req.session.user && req.session.user.approved) {
      db.updateUserNavigateValue(req)
      next(); 
  }else{
    res.redirect('/login');
  }
  return;
  //return res.send(JSON.stringify(req.session, null, 2));
  
  
});



app.use('/ajax', ajaxRouter);
app.use('/', indexRouter);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
