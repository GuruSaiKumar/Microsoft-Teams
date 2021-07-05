const currentLink = window.location.host + '/';
console.log(currentLink)

const socket = io(currentLink);
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
const showChat = document.querySelector("#showChat");
const backBtn = document.querySelector(".header__back");
myVideo.muted = true;

backBtn.addEventListener("click", () => {
  document.querySelector(".main__left").style.display = "flex";
  document.querySelector(".main__left").style.flex = "1";
  document.querySelector(".main__right").style.display = "none";
  document.querySelector(".header__back").style.display = "none";
});

showChat.addEventListener("click", () => {
  document.querySelector(".main__right").style.display = "flex";
  document.querySelector(".main__right").style.flex = "1";
  document.querySelector(".main__left").style.display = "none";
  document.querySelector(".header__back").style.display = "block";
});

const user = prompt("Enter your name");

/*
Basically we need a peerServer for generating a new Id for each user.
For testing locally we can run a server on some port by using this command
"peerjs --port 443" => This creates a peerserver on localhost:443
*/ 
var peer = new Peer(undefined, {
  host: "gurus-peerjs-server.herokuapp.com", //My peerJs server
  // host: '/', //For testing on local machine
  secure: true // For checking secure or insecure i.e, http or https
});


const peers = {};

let myVideoStream;
navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    peer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on("user-connected", (userId) => {
      // connectToNewUser(userId, stream);
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
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    video.remove()
  })

  peers[userId] = call
};

peer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id, user);
});


const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.controls = true;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    videoGrid.append(video);
  });
};

let text = document.querySelector("#chat_message");
let sendMessage = document.getElementById("send");
let messages = document.querySelector(".messages");

sendMessage.addEventListener("click", (e) => {
  //If message is not empty  emit the message event;
  if (text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";//Clear the textbox
  }
});

//Send the message if the user presses Enter
text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});

const inviteButton = document.querySelector("#inviteButton");
const muteButton = document.querySelector("#muteButton");
const stopVideo = document.querySelector("#stopVideo");
const shareScreen =document.querySelector("#shareScreen");

muteButton.addEventListener("click", () => {
  const MicEnabled = myVideoStream.getAudioTracks()[0].enabled;
  if (MicEnabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setMuteButton();
    // html = `<i class="fas fa-microphone-slash"></i>`;
    // muteButton.classList.toggle("background__red");
    // muteButton.innerHTML = html;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    unsetMuteButton();
    // html = `<i class="fas fa-microphone"></i>`;
    // muteButton.classList.toggle("background__red");
    // muteButton.innerHTML = html;
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

inviteButton.addEventListener("click", (e) => {
  var share = document.createElement("input"),
  text = window.location.href;
  
  console.log(text);
  document.body.appendChild(share);
  share.value = text;
  share.select();
  document.execCommand("copy");
  document.body.removeChild(share);
  alert('Invite link has been copied.');
});

shareScreen.addEventListener("click", async ()=>{
  const video = document.createElement("video");
  let captureStream = null;

  try {
    captureStream = await navigator.mediaDevices.getDisplayMedia();
    // let Sender = peer.getSenders().map(function (sender) {
    //   sender.replaceTrack(captureStream.getTracks().find(function (track) {
    //       return track.kind === sender.track.kind;
    //   }));
    // });
    // Sender.replaceTrack(captureStream)
    addVideoStream(video, captureStream);
    // video.srcObject = captureStream;
    // video.onloadedmetadata = function(e) {
    //   video.play();
    //   videoGrid.append(video);
    // };

  } catch(err) {
    console.error("Error: " + err);
  }
  // return captureStream;
})

socket.on("createMessage", (message, userName) => {
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


var ResponseTime = document.getElementById("rtt-value");

function claculateRTT(){
  var networkInformation = navigator.connection;
  ResponseTime.innerHTML = networkInformation.rtt + " ms";
}

function recurciveCalculate(){
  claculateRTT();
  console.log("Calculating ping ...");
  setTimeout(recurciveCalculate,5000);
}

recurciveCalculate();