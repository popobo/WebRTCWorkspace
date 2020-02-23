"use strict"

var localVideo = document.querySelector("video#localvideo");
var remoteVideo = document.querySelector("video#remotevideo");

var btnStart = document.querySelector("button#start");
var btnCall = document.querySelector("button#call");
var btnHangUp = document.querySelector("button#hangup")
;

var offerText = document.querySelector("textarea#offer");
var answerText = document.querySelector("textarea#offer");

var localStrem;
var pc1;
var pc2;

function getMediaStream(stream){
    localVideo.srcObject = stream;
    localStrem = stream;
}

function handleError(err){
    console.error("Failed to get media stream", err);
}

function start(){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
        console.error("The getUserMedia is not supported!");
        return;
    } else {
        var contraints = {
            video:true, 
            audio:false
        };
        navigator.mediaDevices.getUserMedia(contraints)
        .then(getMediaStream)
        .catch(handleError);
    }
}

function getRemoteStream(e){
    remoteVideo.srcObject = e.streams[0];
}

function handleOfferError(err){
    console.error("Failed to create answer:" + err);
}

function getOffer(desc){
    pc1.setLocalDescription(desc);
    offerText.value = desc.sdp;
    
    //send desc to signal
    //receive desc from signal
    
    pc2.setRemoteDescription(desc);
    pc2.createAnswer()
    .then(getAnswer)
    .catch(handleAnswerError);
}

function handleAnswerError(err){
    console.error("Failed to create answer:" + err);
}

function getAnswer(desc){
    pc2.setLocalDescription(desc);
    answerText.value = desc.sdp;
    //send desc to signal
    //receive desc from signal
    pc1.setRemoteDescription(desc);
}

function call(){
    pc1 = new RTCPeerConnection();//模拟本地
    pc2 = new RTCPeerConnection();//模拟远端
    pc1.onicecandidate = (e)=>{
        pc2.addIceCandidate(e.candidate);
    }
    pc2.onicecandidate = (e)=>{
        pc1.addIceCandidate(e.candidate);
    }
    pc2.ontrack = getRemoteStream;

    localStrem.getTracks().forEach((track)=>{
        pc1.addTrack(track, localStrem);
    });

    //开始进行媒体协商
    var offerOptions = {
        offerToReceiveAudio:0,
        offerToReceiveVideo:1
    };
    pc1.createOffer(offerOptions)
    .then(getOffer)
    .catch(handleOfferError);
}

function hangup(){
    pc1.close();
    pc2.close();
    pc1 = null;
    pc2 = null;
}

btnStart.onclick = start;
btnCall.onclick = call;
btnHangUp.onclick = hangup;
