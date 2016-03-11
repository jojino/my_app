var express = require('express');
var app = express();
var path = require('path');
/*
app.get('/', function(req, res) {
  res.send('Hello World!');
});*/

//app.use(express.static(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'publuc')));
console.log(__dirname);

app.listen(3000, function() {
  console.log('Server On!');
});
