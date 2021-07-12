const express = require('express');
const app = express();
const { v4: uuidv4 } = require('uuid');


//****************************//PORT //****************************//
const port = process.env.PORT || 3000; // While hosting 3000 may not be available
const server=app.listen(port,()=> console.log(`Listening on port ${port}..`));


//****************************//SOCKET AND PEER SETUP //****************************//
const io = require('socket.io')(server, {
  cors: {
    origin: '*'
  }
});

const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true,
});


app.set('view engine', 'ejs');
app.use('/peerjs', peerServer);
app.use(express.static('public'));


//****************************//GET REQUESTS //****************************//
app.get('/', (req, res) => {
  res.redirect(`/${uuidv4()}`);// Creates a new random id and redirects it.
});

app.get('/leave',(req, res)=>{
  res.render("leave");
});

app.get('/:room', (req, res) => {
  res.render("room", { roomId: req.params.room });
});

//****************************//SOCKET IO CONNECTION //****************************//
io.on("connection", (socket) => {

  //When a new user joins the room we emit a event "user-connected" to all others in the room
  socket.on("join-room", (roomId, userId, userName) => {
    socket.join(roomId);
    socket.broadcast.to(roomId).emit("user-connected",userId,userName)

    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userName);
    });

    socket.on("typing",() => {
      socket.broadcast.to(roomId).emit("typing",userName);
    });

    socket.on("stoppedTyping",() => {
      socket.broadcast.to(roomId).emit("stoppedTyping");
    })
    socket.on('disconnect', () => {
      socket.broadcast.to(roomId).emit('user-disconnected', userId)
    })
  });

});


