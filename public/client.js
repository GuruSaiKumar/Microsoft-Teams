const currentLink = window.location.host + '/';
console.log(currentLink)

const socket = io(currentLink);
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;


const user = prompt("Enter your name");

/*
Basically we need a peerServer for generating a new Id for each user.
For testing locally we can run a server on some port by using this command
"peerjs --port 443" => This creates a peerserver on localhost:443
*/ 
var peer = new Peer(undefined, {
  host: "gurus-peerjs-server.herokuapp.com",
  // host: '/', //For testing on local machine
  secure: true
});


var peers = {};
var currentPeer = [];
var userlist = [];
var cUser;

var myVideoStream;
navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    peer.on("call", (call) => {
      // Answer the call, providing our mediaStream
      call.answer(stream);
      const video = document.createElement("video");

      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });

      currentPeer.push(call.peerConnection);

      call.on("close", () =>{
        video.remove();
      })
    });

    socket.on("user-connected", (userId) => {
      console.log('New User Connected: ' + userId)
      const fc = () => connectToNewUser(userId, stream)
      timerid = setTimeout(fc, 1000 )
    });

    
    socket.on('user-disconnected', userId => {
      if (peers[userId]) peers[userId].close();
      console.log(userId + " : Disconnected :(");
    })
  });

const connectToNewUser = (userId, stream) => {
  // Call a peer, providing our mediaStream
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    video.remove()
  })

  peers[userId] = call;
  currentPeer.push(call.peerConnection);
};

peer.on("open", (id) => {
  cUser = id;
  socket.emit("join-room", ROOM_ID, id, user);
});


const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.controls = true;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
};




//****************************// AUDIO HANDLING //****************************//

const muteButton = document.querySelector("#muteButton");

muteButton.addEventListener("click", () => {
  const MicEnabled = myVideoStream.getAudioTracks()[0].enabled;
  if (MicEnabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setMuteButton();
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    unsetMuteButton();
  }
});

const unsetMuteButton = ()=>{
  const html = `<i class="fas fa-microphone"></i>`;
  muteButton.innerHTML = html;
  console.log("You are Unmuted");
}

const setMuteButton = () =>{
 const html = `<i class="fas fa-microphone-slash" style="color:red;"></i>`;
 muteButton.innerHTML = html;
 console.log("Muted");
}



//****************************// VIDEO HANDLING //****************************//

const stopVideo = document.querySelector("#stopVideo");

stopVideo.addEventListener("click", () => {
  const VideoEnabled = myVideoStream.getVideoTracks()[0].enabled;
  if (VideoEnabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    unsetVideoButton();
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    setVideoButton();
  }
});

const setVideoButton = ()=>{
  const html = `<i class="fas fa-video"></i>`;
  stopVideo.innerHTML = html;
  console.log("Cammera Mode ON");
}

const unsetVideoButton = () =>{
 const html = `<i class="fas fa-video-slash" style="color:red;"></i>`;
 stopVideo.innerHTML = html;
 console.log("Cammera Mode OFF");
}


//****************************// INVITE  //****************************//

const inviteButton = document.querySelector("#inviteButton");

inviteButton.addEventListener("click", (e) => {
  var share = document.createElement("input"),
  text = window.location.href;
  document.body.appendChild(share);
  share.value = text;
  share.select();
  document.execCommand("copy");
  document.body.removeChild(share);
  alert('Invite link has been copied.');
});

//****************************// SCREEN SHARING //****************************//

const shareScreen = document.querySelector("#shareScreen");

shareScreen.addEventListener("click", async ()=>{
  const video = document.createElement("video");
  var captureStream = null;

  try {
    captureStream = await navigator.mediaDevices.getDisplayMedia();
    var videoTrack = captureStream.getVideoTracks()[0];

    videoTrack.onended = ()=>{
      stopScreenShare();
    }

    for( var x = 0; x<currentPeer.length; x++){
      var sender = currentPeer[x].getSenders().find((s)=>{
        return s.track.kind === videoTrack.kind;
      })
      sender.replaceTrack(videoTrack);
    }
  } catch(err) {
    console.error("Error: " + err);
  }
})


function stopScreenShare(){
  var videoTrack = myVideoStream.getVideoTracks()[0];
  for(var x =0;x<currentPeer.length;x++){
    var sender = currentPeer[x].getSenders().find((s)=>{
      return s.track.kind === videoTrack.kind;
    })
    sender.replaceTrack(videoTrack);
  }
}


//****************************// MESSAGING //****************************//
var text = document.querySelector("#chat_message");
var sendMessage = document.getElementById("send");
var messages = document.querySelector(".messages");
var feedback = document.getElementById('feedback');


socket.on('typing', function(data){
  feedback.innerHTML = '<p><em>' + data + ' is typing a message...</em></p>';
});

socket.on("stoppedTyping",()=>{
  feedback.innerHTML = "";
})
sendMessage.addEventListener("click", (e) => {
  //If message is not empty  emit the message event;
  if (text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";//Clear the textbox
  }
});

//Send the message if the user presses Enter
text.addEventListener("keydown", (K) => {
  if (K.key === "Enter" && text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
  else if(text.value.length!==0){
    socket.emit("typing");
  }
  else if(text.value.length ===0){
    socket.emit("stoppedTyping");
  }
});
socket.on("createMessage", (message, userName) => {
  feedback.innerHTML = '';
  //For adding message
  messages.innerHTML =
    messages.innerHTML +
    `<div class="message">
        <div class = "profile" >
          <b><i class="far fa-user-circle"></i> <span> ${
            userName === user ? "me" : userName
          }</span> </b>
          <div class = "time">
            <time> ${ new Date().toLocaleTimeString([], { hour: '2-digit', minute: "2-digit" }) }</time>
          </div>
        </div>
        <span>${message}</span>
    </div>`;

  //For scrolling to bottom
  var chatWindow = document.querySelector(".main__chat_window");
  var xH = chatWindow.scrollHeight; 
  chatWindow.scrollTo(0, xH);
});


const showChat = document.querySelector("#showChat");
const backBtn = document.querySelector(".header__back");

showChat.addEventListener("click", () => {
  document.querySelector(".main__right").style.display = "flex";
  document.querySelector(".main__right").style.flex = "1";
  document.querySelector(".main__left").style.display = "none";
  document.querySelector(".header__back").style.display = "block";
});

backBtn.addEventListener("click", () => {
  document.querySelector(".main__left").style.display = "flex";
  document.querySelector(".main__left").style.flex = "1";
  document.querySelector(".main__right").style.display = "none";
  document.querySelector(".header__back").style.display = "none";
});


//****************************// PING INFO //****************************//

var ResponseTime = document.getElementById("rtt-value");

function claculateRTT(){
  var networkInformation = navigator.connection;
  var ping = networkInformation.rtt;
  ResponseTime.innerHTML = ping + " ms";
  var networkInfo = document.getElementById("network-content");
  if(ping<200){
    networkInfo.style.backgroundColor = "#00FF40";
  }
  else if (ping<350){
    networkInfo.style.backgroundColor = "yellow";
  }
  else{
    networkInfo.style.backgroundColor = "red";
  }
  
}

function recurciveCalculate(){
  claculateRTT();
  console.log("Calculating ping ...");
  setTimeout(recurciveCalculate,5000);
}

recurciveCalculate();