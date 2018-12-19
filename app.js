var express = require('express');
var createError = require('http-errors');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser')
var logger = require('morgan');
var ejs = require('ejs')
var cors = require('cors')
var session = require('express-session')
var MongoStroe = require('connect-mongo')(session)
var mongoose = require('mongoose')
mongoose.connect('mongodb://localhost:27017/space', { useNewUrlParser: true })
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var blogsRouter = require('./routes/blogs');
var sharesRouter = require('./routes/shares');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors({
  origin: "http://localhost:8888",
  credentials: true
}))  //允许所有的请求跨域
app.use(logger('dev'));
// 限制请求体大小为2MB
app.use(bodyParser.json({"limit": "2048kb"}))
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  name: 'sessionId',
  secret: 'legendNeverDie',
  store: new MongoStroe({
    mongooseConnection: mongoose.connection
  }),
  saveUninitialized: false,
  resave: false,
  cookie: {
    secure: false,
    httpOnly: false,
    maxAge: 1000 * 60 * 60 * 24 * 15
  }
}))
app.use('/blog', blogsRouter);
app.use('/users', usersRouter);
app.use('/share', sharesRouter);
app.use(express.static(path.join(__dirname, './dist')));
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
  console.log(res.locals.error)
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
