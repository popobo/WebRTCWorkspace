"use strict"
var localVideo = document.querySelector("video#localVideo");
var remoteVideo = document.querySelector("video#remoteVideo");

var btnConnect = document.querySelector("button#connserver");
var btnLeave = document.querySelector("button#leave");

var offer = document.querySelector("textarea#offer");
var answer = document.querySelector("textarea#answer");

var shareDeskBox = document.querySelector("input#shareDesk");

var selBw = document.querySelector("select#bandwidth");

var chat = document.querySelector("textarea#chat");
var sendText = document.querySelector("textarea#sendText");
var btnSend = document.querySelector("button#send");

var pcConfig = {
    "iceServers": [{
        "urls": "turn:bocode.xyz:3478",
        "credential": "123654",
        "username": "bo_turn"
    }]
};

var localStream = null;
var remoteStream = null;
var pc = null;
var dc = null;
var roomId;
var socket = null;
var offerDesc = null;
var state = "init";

var lastStat = null;
var bitrateGraph;
var bitrateSeries;

var packetGraph;
var packetSeries;

//如果返回的是false说明当前操作系统是手机端，如果返回的是true则说明当前的操作系统是电脑端
function IsPC() {
    var userAgentInfo = navigator.userAgent;
    var Agents = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"];
    var flag = true;

    for (var v = 0; v < Agents.length; v++) {
        if (userAgentInfo.indexOf(Agents[v]) > 0) {
            flag = false;
            break;
        }
    }

    return flag;
}

//如果返回true 则说明是Android  false是ios
function is_android() {
    var u = navigator.userAgent,
        app = navigator.appVersion;
    var isAndroid = u.indexOf("Android") > -1 || u.indexOf("Linux") > -1; //g
    var isIOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); //ios终端
    if (isAndroid) {
        //这个是安卓操作系统
        return true;
    }

    if (isIOS) {
        //这个是ios操作系统
        return false;
    }
}

//获取url参数
function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }
    return (false);
}

//=======================================================================

function hang_up() {
    if (pc) {
        offerDesc = null;
        pc.close();
        pc = null;
    }
}

function send_message(roomId, data) {
    console.log("send p2p message", roomId, data);
    if (socket) {
        socket.emit("message", roomId, data);
    } else {
        console.log("socket is null");
    }
}

function handle_offer_error(error) {
    if (error) {
        console.error("Failed to get offer", error);
    }
}

function get_offer(desc) {
    pc.setLocalDescription(desc);
    offer.value = desc.sdp;
    offerDesc = desc;

    send_message(roomId, offerDesc);
}

function handle_answer_error(error) {
    if (error) {
        console.error("Failed to get answer" + error);
    }
}


function get_answer(desc) {
    selBw.disabled = false;

    pc.setLocalDescription(desc);
    answer.value = desc.sdp;

    //send answer sdp
    send_message(roomId, desc);
}

function call() {
    if (state == "joined_conn") {
        if (pc) {
            var offerOptions = {
                //是否能接受远端的视频音频
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1,
            };
            pc.createOffer(offerOptions)
                .then(get_offer)
                .catch(handle_offer_error);
        }
    }
}

function conn_signal_server() {
    //开启本地视频
    start();

    return true;
}

function bind_tracks() {
    console.log("bind tracks into RTCPeerConnection!");

    if (pc === null || pc === undefined) {
        console.error("pc is null or undefined!");
        return;
    }

    if (localStream === null || localStream === undefined) {
        console.error("localstream is null or undefined!");
        return;
    }

    //add all track into peer connection
    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
    });
}

function receive_msg(e){
    var msg = e.data;
    if(msg){
        chat.value += "->" + msg + "\r\n";
    }else{
        console.error("received msg is null");
    }
}

function data_channel_state_change(){
    var readyState = dc.readyState;
    if("open" == readyState){
        sendText.disabled = false;
        btnSend.disabled = false;
    }else{
        sendText.disabled = true;
        btnSend.disabled = true;
    }
}

function conn() {
    socket = io.connect();
    socket.on("joined", (roomId, id) => {
        console.log("receive joined message:", roomId, id);

        state = "joined";

        create_peer_connection();
        bind_tracks();

        btnConnect.disabled = true;
        btnLeave.disabled = false;
        console.log("receive joined message:state=", state);
    });

    socket.on("otherjoin", (roomId) => {
        console.log("receive otherjoin message:", roomId, state);
        if (state == "joined_unbind") {
            create_peer_connection();
            bind_tracks();
        }
        
        //dataChannel的创建必须在call()之前
        dc = pc.createDataChannel("chat");
        dc.onmessage = receive_msg;
        dc.onopen = data_channel_state_change;
        dc.onclose = data_channel_state_change;
        console.log("receive otherjoin message:state=", state);
        
        state = "joined_conn";
        //媒体协商
        call();
    });

    socket.on("full", (roomId, id) => {
        console.log("receive full message:", roomId, id);
        hang_up();
        close_local_media();
        state = "leaved";
        alert("房间已满");
        console.log("receive full message:state=", state);
    });

    socket.on("leaved", (roomId, id) => {
        console.log("receive leaved message:", roomId, id);
        state = "leaved";
        socket.disconnect();
        btnConnect.disabled = false;
        btnLeave.disabled = true;
        console.log("receive leaved message:state=", state);
    });

    socket.on("bye", (roomId, id) => {
        console.log("receive bye message:", roomId, id);
        state = "joined_unbind"
        hang_up();
        offer.value = "";
        answer.value = "";
        console.log("receive bye message:state=", state);
    });

    socket.on("disconnect", (socket) => {
        console.log("receive disconnect message!", roomId);
        if (!("leaved" === state)) {
            hang_up();
            close_local_media();
        }
        state = "leaved";
    });

    socket.on("message", (roomId, data) => {
        console.log("receive client message:", roomId, data);

        if (null === data || undefined === data) {
            console.error("the data is invalid");
            return;
        }

        //媒体协商
        console.log(data.type);
        if (data.hasOwnProperty("type") && data.type === "offer") {

            offer.value = data.sdp;

            pc.setRemoteDescription(new RTCSessionDescription(data));

            //create answer
            pc.createAnswer()
                .then(get_answer)
                .catch(handle_answer_error);

        } else if (data.hasOwnProperty("type") && data.type == "answer") {
            selBw.disabled = false;
            answer.value = data.sdp;
            pc.setRemoteDescription(new RTCSessionDescription(data));

        } else if (data.hasOwnProperty("type") && data.type === "candidate") {
            console.log(data.label);
            var candidate = new RTCIceCandidate({
                sdpMLineIndex: data.label,
                sdpMid: data.id,
                candidate: data.candidate
            });
            pc.addIceCandidate(candidate);

        } else {
            console.log("the message is invalid!", data);
        }
    });

    roomId = getQueryVariable("room");
    socket.emit("join", roomId);

    return;
}

function get_media_stream(stream) {
    if (localStream) {
        stream.getAudioTracks().forEach((track) => {
            localStream.addTrack(track);
            stream.removeTrack(track);
        });
    } else {
        localStream = stream;
    }
    localVideo.srcObject = localStream;

    //这个函数的位置特别重要，
    //一定要放到get_media_stream之后再调用
    //否则就会出现绑定失败的情况
    conn();
    bitrateSeries = new TimelineDataSeries();
    bitrateGraph = new TimelineGraphView("bitrateGraph", "bitrateCanvas");
    bitrateGraph.updateEndDate;

    packetSeries = new TimelineDataSeries();
    packetGraph = new TimelineGraphView("packetGraph", "packetCanvas");
    packetGraph.updateEndDate;
}

function get_desk_stream() {
    localStream = stream;
}

function share_desk() {
    if (IsPC()) {
        navigator.mediaDevices.getDisplayMedia({
                video: true
            })
            .then(get_desk_stream)
            .catch(handle_error);

        return true;
    }

    return false;
}

function handle_error(error) {
    if (error) {
        console.error("failed to getUserMedia" + error);
    }
}

function start() {
    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {
        console.error("the getUserMedia is not supported!");
        return;
    } else {

        var constraints;

        if (shareDeskBox.checked && share_desk()) {

            constraints = {
                video: false,
                // audio: {
                //     echoCancellation: true,
                //     noiseSuppression: true,
                //     autoGainControl: true
                // }
                audio: false
            }

        } else {
            constraints = {
                video: true,
                // audio: {
                //     echoCancellation: true,
                //     noiseSuppression: true,
                //     autoGainControl: true
                // }
                audio: false
            }
        }

        navigator.mediaDevices.getUserMedia(constraints)
            .then(get_media_stream)
            .catch(handle_error);
    }
}

function leave() {
    if (socket) {
        socket.emit("leave", roomId);
    }

    hang_up();
    close_local_media();

    offer.value = "";
    answer.value = "";
    btnConnect.disabled = false;
    btnLeave.disabled = true;
}

function close_local_media() {
    if (localStream && localStream.getTracks()) {
        localStream.getTracks().forEach((track) => {
            track.stop();
        });
    }
    localStream = null;
}

function get_remote_stream(e) {
    remoteStream = e.streams[0];
    remoteVideo.srcObject = e.streams[0];
}

function create_peer_connection() {
    console.log("create RTCPeerConnection");
    if (!pc) {
        pc = new RTCPeerConnection(pcConfig);

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                console.log("find an new candidate", e.candidate);
                console.log("---------------------", e.candidate.sdpMLineIndex, e.candidate.sdpMid);
                send_message(roomId, {
                    type: "candidate",
                    lable: e.candidate.sdpMLineIndex,
                    id: e.candidate.sdpMid,
                    candidate: e.candidate.candidate
                });
            } else {
                console.log("this is the end candidate");
            }
        };
        
        pc.ondatachannel = (e)=>{
            if(!dc){
                dc = e.channel;
                dc.onmessage = receive_msg;
                dc.onopen = data_channel_state_change;
                dc.onclose = data_channel_state_change;
            }
        };

        pc.ontrack = get_remote_stream;
    } else {
		console.warning("the pc have be created!");
	}

    return;
}

function close_peer_connection() {
    console.log("close peer connection");
    if (pc) {
        pc.close();
        pc = null;
    }
}

function change_bw(){
    selBw.disabled = true;
    var selBwVal = selBw.options[selBw.selectedIndex].value;
    var senders = pc.getSenders();
    var videoSender = null;

    senders.forEach((sender)=>{
        if(sender && sender.track.kind === "video"){
            videoSender = sender;
        }

        var parameters = videoSender.getParameters();
        if(!parameters.encodings){
            return;
        }

        if(selBwVal === "unlimited"){
            return;
        }

        parameters.encodings[0].maxBitrate = selBwVal * 1000;
        videoSender.setParameters(parameters)
        .then(()=>{
            selBw.disabled = false;
            console.log("Successed to set parameters!");
        })
        .catch((err)=>{
            console.error(err);
        });

    });
}

window.setInterval(()=>{
    var sender = pc.getSenders()[0];
    if(!sender){
        return;
    }
    sender.getStats()
    .then((reports)=>{
        reports.forEach((report)=>{
            if(report.type === "outbound-rtp"){
                if(report.isRemote){
                    return;
                }
                var curTs = report.timestamp;
                var bytes = report.bytesSent;
                var packets = report.packetsSent;
                if(lastStat && lastStat.has(report.id)){
                    var bitrate = 8 * (bytes - lastStat.get(report.id).bytesSent) / (curTs - lastStat.get(report.id).timestamp);
                
                    bitrateSeries.addPoint(curTs, bitrate);
                    bitrateGraph.setDataSeries([bitrateSeries]);
                    bitrateGraph.updateEndDate();
                    
                    packetSeries.addPoint(curTs, packets - lastStat.get(report.id).packetsSent);
                    packetGraph.setDataSeries([packetSeries]);
                    packetGraph.updateEndDate();
                }
            }
        });
        lastStat = reports;
    })
    .catch((err)=>{
        console.error(err);
    });
}, 1000);

function send_text(){
    var data = sendText.value;
    if(data){
        dc.send(data);
    }
    sendText.value = '';
    chat.value += "<-" + data + "\r\n";
}

btnConnect.onclick = conn_signal_server;
btnLeave.onclick = leave;
selBw.onchange = change_bw;
btnSend.onclick = send_text;