var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');

/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

router.get('*', function (req, res) {
  var html = fs.readFileSync(path.resolve(__dirname, '../dist/index.html'), 'utf-8');
  res.send(html);  
})

router.get('/error', function(req, res, next) {
  let message = res.locals.error ? res.locals.error.message : 'message: 无'
  let error =  res.locals.error ? res.locals.error : {status: 'status: 无', stack: 'stack: 无'}
  res.render('error', { message, error });
});

module.exports = router;
