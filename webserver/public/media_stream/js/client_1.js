"use strict"

var audioInput = document.querySelector("select#audioInput");
var audioOutput = document.querySelector("select#audioOutput");
var videoInput = document.querySelector("select#videoInput");

var videoPlayer = document.querySelector("video#player");
var audioPlayer = document.querySelector("audio#audioplayer");

var filterSelect = document.querySelector("select#filter");

var snapshot = document.querySelector("button#snapshot");
var picture = document.querySelector("canvas#picture");
picture.width = 640;
picture.height = 480;

var divConstraints = document.querySelector("div#constraints");

var recVideo = document.querySelector("video#recplayer");
var recordButton = document.querySelector("button#record");
var recplayButton = document.querySelector("button#recplay");
var downloadButton = document.querySelector("button#download");

var buffer;
var mediaRecorder;

function getMediaStream(stream){
    videoPlayer.srcObject = stream;
    var videoTrack = stream.getVideoTracks()[0];
    var videoContraints = videoTrack.getSettings();
    divConstraints.textContent = JSON.stringify(videoContraints, null, 2);
    window.stream = stream;
    // audioPlayer.srcObject = stream;
    return navigator.mediaDevices.enumerateDevices();
}

function handleError(err){
    console.log("getUserMedia error:", err);
}

function getDevices(deviceInfos){
    deviceInfos.forEach(function(deviceInfo){
        console.log(deviceInfo.kind + ": lable = "
        + deviceInfo.label + ": id = "
        + deviceInfo.deviceId + ": groupId = "
        + deviceInfo.groupId);
        var option = document.createElement("option");
        option.text = deviceInfo.label;
        option.value = deviceInfo.deviceId;
        if(deviceInfo.kind === "audioinput"){
            audioInput.appendChild(option);
        }else if(deviceInfo.kind === "audiooutput"){
            audioOutput.appendChild(option);
        }else if(deviceInfo.kind == "videoinput"){
            videoInput.appendChild(option);
        }
    });
}

function start(){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
        console.log("getUserMedia is not supported!");
        // console.log("getDisplayMedia is not supported!");
        return;
    }else{
        var deviceId = videoInput.value;
        var constraints = {
            video:{
                width:320,
                height:240,
                frameRate:30,
                //environment需要引号
                facingMode:"environment",
                deviceId:deviceId?deviceId:undefined
            },
            // video:false,
            audio:{
                noiseSupportssion:true,
                echoCancellation:true
            }
            // video:true,
            // audio:false
        }
        navigator.mediaDevices.getUserMedia(constraints)
        // navigator.mediaDevices.getDisplayMedia(constraints)
        .then(getMediaStream)
        .then(getDevices)
        .catch(handleError);
    }
}

start();

videoInput.onchange = start;
filterSelect.onchange = function(){
    videoPlayer.className = filterSelect.value;
}

snapshot.onclick = function(){
    //videoPlayer源
    picture.className = filterSelect.value;
    picture.getContext("2d").drawImage(videoPlayer,
                                      0, 0,
                                      picture.width,
                                      picture.height);
}

function handleDataAvailable(e){
    if(e && e.data && e.data.size > 0){
        buffer.push(e.data);
    }
}

function startRecord(){
    buffer = [];

    var options = {
        mimeType:"video/webm;codecs=vp8"
    }
    if(!MediaRecorder.isTypeSupported(options.mimeType)){
        console.error("${options.mimeType} is not supported!");
        return;
    }

    try{
        mediaRecorder = new MediaRecorder(window.stream, options);
    }catch(e){
        console.error("Failed to create MediaRecorder:", e);
        return;
    }

    mediaRecorder.ondataavailable = handleDataAvailable;
    //每隔10个时间片存储一次数据
    mediaRecorder.start(10);
}

function stopRecord(){
    mediaRecorder.stop();
}

recordButton.onclick = ()=>{
    if(recordButton.textContent === "Start Record"){
        startRecord();
        recordButton.textContent = "Stop Record";
        recplayButton.disabled = true;
        downloadButton.disabled = true;
    }else{
        stopRecord();
        recordButton.textContent = "Start Record";
        recplayButton.disabled = false;
        downloadButton.disabled = false;
    }
}

recplayButton.onclick = ()=>{
    var blob = new Blob(buffer, {type:"video/webm"});
    recVideo.src = window.URL.createObjectURL(blob);
    recVideo.srcObject = null;
    recVideo.controls = true;
    recVideo.play();
}

downloadButton.onclick = ()=>{
    var blob = new Blob(buffer, {type:"video/webm"});
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.style.display = "none";
    a.download = "aaa.webm";
    a.click();
}