'use strict'

//nodejs自带
var http = require('http');
var https = require('https');
var fs = require('fs');

//需要用npm安装
var express = require('express');
var serverIndex = require('serve-index');

//socket.io
var socketIo = require("socket.io");

var log4js = require("log4js");

var USERCOUNT = 3;

log4js.configure({
    appenders:{
        file:{
            type:"file",
            filename:"app.log",
            layout:{
                type:"pattern",
                pattern:"%r %p - %m"
            }
        }
    },
    categories:{
        default:{
            appenders:["file"],
            level:"debug"
        }
    }
});
var logger = log4js.getLogger();

var app = express();
//发布静态目录的方法
app.use(serverIndex('./public'));
app.use(express.static('./public'));

var http_server = http.createServer(app);
http_server.listen(80, '0.0.0.0');

var options = {
    key : fs.readFileSync('./cert/privkey.pem'),
    cert : fs.readFileSync('./cert/fullchain.pem')
};

var https_server = https.createServer(options, app);
// bind socketio with https_server
var io = socketIo.listen(https_server);
//connection
io.sockets.on("connection", (socket)=>{
    // socket.on("message", (room, data)=>{
    //     socket.to(room).emit("message", room, socket.id, data);
    // });
    socket.on('message', (room, data)=>{
		socket.to(room).emit('message', room, data);
	});

    socket.on("join", (room)=>{
        socket.join(room);
        var myRoom = io.sockets.adapter.rooms[room];
        //房间里用户数量
        var users = Object.keys(myRoom.sockets).length;
        logger.info("the number of user in room is:" + users);
        if(users < USERCOUNT){
            socket.emit("joined", room, socket.id);//发送给加入的用户
            if(users > 1){
                socket.to(room).emit("otherjoin", room);
            }
        }
        else{
            socket.leave(room);
            socket.emit("full", room, socket.id);//给连接端发送full
        }
        //给连接对端发消息
        //socket.emit("joined", room, socket.id);
        //给该房间除了自己所有用户发消息
        //socket.to(room).emit("joined", room, socket.id); 
        //给该房间所有用户发消息
        // io.in(room).emit("joined", room, socket.id);///除自己，全部站点
        // socket.broadcast.emit("joined", room, socket.id);
    });
    socket.on("leave", (room)=>{
        socket.join(room);
        var myRoom = io.sockets.adapter.rooms[room];
        //房间里用户数量
        // var users = Object.keys(myRoom.sockets).length;
        var users = (myRoom)?Object.keys(myRoom.sockets.length):0;
        logger.info("the number of user in room is:" + (users - 1));
        //user-1
        socket.to(room).emit("bye", room, socket.id);//给房间内其他人发
        socket.emit("leaved", room, socket.id);//给连接对端发消息
        //给该房间除了自己所有用户发消息
        //socket.to(room).emit("left", room, socket.id); 
        //给该房间所有用户发消息
        // io.in(room).emit("left", room, socket.id);///除自己，全部站点
        // socket.broadcast.emit("left", room, socket.id);
    });
});

https_server.listen(443, '0.0.0.0');
