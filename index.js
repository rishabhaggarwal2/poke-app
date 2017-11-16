var express = require("express");
var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);

app.use(express.static("public"));

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/particle", function(req, res) {
  res.sendFile(__dirname + "/particle.html");
});

var users = [];

io.on("connection", function(socket) {
  console.log("a user connnected");

  socket.on("connectlol", function(id) {
    console.log("a user sent connection");
    var rand = Math.random();
    while(!rand) {
      rand = Math.random();
    }
    users.push({
      id: id,
      pokes: 5,
      fatness: 5,
      color: Math.random() * 0xffffff,
      x: Math.random() * 50 - 25,
      y: Math.random() * 50 - 25,
      z: Math.random() * 50 - 25,
      alive: true,
    });
    io.emit("add user", users);
  });

  socket.on("poke", function(pokeDetails) {
    var toDelete = [];
    users.forEach((user, index) => {
      if(user.id == pokeDetails.poker) {
        user.fatness --;
        user.pokes --;
      } else if (user.id == pokeDetails.poked) {
        user.fatness ++;
      }
      if(user.fatness >= 10 || user.fatness <= -0) {
        user.alive = false;
      }
      if(user.fatness >= 11 || user.fatness <= -1) {
        toDelete.push(index);
      }
    });
    if(toDelete.length) {
      toDelete.forEach(index => {
        users.splice(index, 1);
      });
      toDelete = [];
    }
    console.log("message: " + pokeDetails);
    io.emit("poke", users);
  });

  socket.on("disconnect", function() {
    console.log("user disconnected");
    io.emit("a user disconnected");
  });
});

http.listen(process.env.PORT || 4000, function() {
  console.log("listening on *:4000");
});
