/*
 * @Descripttion: 
 * @version: 
 * @Author: sueRimn
 * @Date: 2020-01-18 14:15:33
 * @LastEditors: sueRimn
 * @LastEditTime: 2020-01-18 14:24:36
 */
'use strict'
var http = require('http');
 
var app = http.createServer(function(req, res){
    res.writeHead(200, {'Content-Type':'text/plain'});
    res.end('Hello World\n');
}).listen(80, '0.0.0.0');