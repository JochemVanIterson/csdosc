const express = require('express');
const app = express();
const path = require('path');
const server = require('http').Server(app);
const io = require('socket.io')(server);
const osc = require('node-osc');
const readline = require('readline');

var sendSocket = [];
var oscServer = [];
var oscClient = [];
var clients = {};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  if (input === "quit" || input === "stop" || input == "hou op!") {
    killOsc();
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  killOsc();
  process.exit(0);
});

//start the server listening on port 8001
server.listen(8001,function() {
  console.log("De server staat aan! Je kunt deze via localhost:8001 bereiken");
});

//zorg dat de server alle paths kan bereiken. 
app.use(express.static(path.join(__dirname,'/')));

//genereer errormessage als de pagina niet bestaat
app.use(function(req,res,next) {
  res.status(400).send("doet het niet");
});

io.on('connection', function (socket) {
  clients[socket.id] = socket;  
  //initialize socket
  socket.on('oscLib',function(data) {
    sendSocket[data] = clients[data];
    sendSocket[data].emit("connected",data);
  });

  //on receiving start message for server
  socket.on('startServer',function(data) {
    serverExist(data.port,data.id,function() {
      console.log("nu maak ik een nieuwe:",data.id,data.port);
      oscServer[data.id] = new osc.Server(data.port,'0.0.0.0');

      sendSocket[data.id].emit("serverRunning",{"port":data.port});
        
      oscServer[data.id].on("message",function(msg,rinfo) {
        var sendData = {"add":msg[0],"msg":msg[1]};
        sendSocket[data.id].emit('getMessage',sendData);
      });
    });
  });

  //on receiving kill message for server
  socket.on('killServer',function() {
    oscServer.kill();
  });

  //on receiving start message for client
  socket.on('startClient',function(data) {
    oscClient[data.id] = new osc.Client(data.ip, data.port);
    sendSocket[data.id].emit("clientRunning",{"ip":data.ip,"port":data.port,"active":1});
  });

  //on receiving kill message for client
  socket.on('killClient',function() {
    oscClient.kill();
  });

  //on receiving message to send
  socket.on('sendMessage',function(data) {
    if (oscClient[data.id]) {
      oscClient[data.id].send(data.address, data.message, function () {
      });  
    }
  });
});

function killOsc() {
  for (var i in oscServer) {
    if (oscServer[i]) {
      oscServer[i].kill();  
    }
  }
  for (var i in oscClient) {
    oscClient[i].kill();
  }
}

function showServers() {
  for (var i in oscServer) {
    console.log(oscServer[i].port);
  }
}

function serverExist(port,id,callback) {
  var found = 0;
  console.log("id:",id);
  for (var i in oscServer) {
    console.log("Existing id's:",i);
    if (oscServer[i] && oscServer[i].port == port) {
      found = 1;
      console.log("port:",port,"id:",i);
      oscServer[i].kill();
      oscServer[i] = null;
      callback();  
    }
  }
  if (!found) {
    callback();  
  }
}



