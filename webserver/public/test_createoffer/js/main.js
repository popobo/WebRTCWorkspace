"use strict"

var btnCreateOffer = document.querySelector("button#createOffer");

var pc = new RTCPeerConnection();
var pc2 = new RTCPeerConnection();

function getAnswer(desc){
    console.log("answer" + desc.sdp);
    pc2.setLocalDescription(desc);

    pc.setRemoteDescription(desc);
}

function getOffer(desc){
    console.log("offer:" + desc.sdp);
    pc.setLocalDescription(desc);

    pc2.setRemoteDescription(desc);
    pc2.createAnswer()
        .then(getAnswer)
        .catch(handleError);
}

function getMediaStream(stream) {
    stream.getTracks().forEach((track) => {
        pc.addTrack(track);
    });

    var options = {
        offerToReceiveAudio: 0,
        offerToReceiveVideo: 1,
        iceRestart: false
    }

    pc.createOffer(options)
        .then(getOffer)
        .catch(handleError);
}

function handleError(err) {
    console.error("Failed to get media stream", err);
}

function getStream() {
    var constraints = {
        audio: false,
        video: true
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(getMediaStream)
        .catch(handleError);
}

function test() {
    if (!pc) {
        console.error("pc is null");
        return;
    }
    getStream();
    return;
}

btnCreateOffer.onclick = test;