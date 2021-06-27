const express = require('express');
const app = express();
const server = require('http').Server(app);
const { v4: uuidv4 } = require('uuid');


//****************************//PORT //****************************//
// process.env.PORT =8080; 
const port = process.env.PORT || 3000; // While hosting 3000 may not be available
server.listen(port, ()=> console.log(`Listening on port ${port}..`));

const io = require('socket.io')(server, {
  cors: {
    origin: '*'
  }
});

const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true,
});


app.set("view engine", "ejs");
app.use("/peerjs", peerServer);
app.use(express.static("public"));


//****************************//GET REQUESTS //****************************//
app.get("/", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId, userName) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);
    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userName);
    });
  });
});


