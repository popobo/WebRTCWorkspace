'use strict'

var https = require('https');
var fs = require('fs');

var options = {
    key : fs.readFileSync('./cert/privkey.pem'),
    cert : fs.readFileSync('./cert/fullchain.pem')
};

var app = https.createServer(options, function(req, res){
    res.writeHead(200, {'Content-Type' : 'text/plain'});
    res.end('Https:Hello World\n');
}).listen(443, '0.0.0.0');