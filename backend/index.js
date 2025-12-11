// index.js — cleaned
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use((req, res, next) => {
  // Add your frontend's deployed origin(s) here
  const allowed = [
    "https://polymeet.vercel.app",
    "https://live-meeting-ten.vercel.app",
    "http://localhost:3000"
  ];
  const origin = req.headers.origin;
  if (allowed.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://polymeet.vercel.app",
      "https://live-meeting-ten.vercel.app",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
  },
  transports: ["websocket"],
});

const roomUsers = {}; // roomId -> [{id, username}]
const pendingRequests = {}; // roomId -> [{id, username}]

function ensureRoom(roomId) {
  if (!roomUsers[roomId]) roomUsers[roomId] = [];
  if (!pendingRequests[roomId]) pendingRequests[roomId] = [];
}

io.on("connection", (socket) => {
  console.log("[SERVER] connected:", socket.id);

  socket.on("join-request", ({ roomId, username }) => {
    if (!roomId || !username) return;
    console.log("[SERVER] join-request:", socket.id, roomId, username);
    ensureRoom(roomId);

    if (roomUsers[roomId].length === 0) {
      roomUsers[roomId].push({ id: socket.id, username });
      socket.join(roomId);

      io.to(socket.id).emit("you-are-host");
      io.to(socket.id).emit("room-users", roomUsers[roomId]);
      return;
    }

    pendingRequests[roomId].push({ id: socket.id, username });
    io.to(socket.id).emit("waiting-for-host");

    const host = roomUsers[roomId][0];
    if (host) io.to(host.id).emit("pending-requests", pendingRequests[roomId]);
  });

  socket.on("admit-user", ({ roomId, userId }) => {
    ensureRoom(roomId);
    const host = roomUsers[roomId][0];
    if (!host || host.id !== socket.id) return;

    const idx = pendingRequests[roomId].findIndex((u) => u.id === userId);
    if (idx === -1) return;

    const [user] = pendingRequests[roomId].splice(idx, 1);
    roomUsers[roomId].push(user);

    // join the socket to the room
    io.to(user.id).socketsJoin(roomId);

    io.to(user.id).emit("admitted", { roomId, users: roomUsers[roomId] });
    io.in(roomId).emit("room-users", roomUsers[roomId]);

    // notify others to start WebRTC handshake
    roomUsers[roomId].forEach((u) => {
      if (u.id !== user.id) {
        io.to(u.id).emit("user-joined", { id: user.id, username: user.username });
      }
    });

    // update host with remaining pending
    io.to(host.id).emit("pending-requests", pendingRequests[roomId]);
  });

  // Reject user from waiting room
  socket.on("reject-user", ({ roomId, userId }) => {
    ensureRoom(roomId);
    const host = roomUsers[roomId][0];
    if (!host || host.id !== socket.id) return;

    const idx = pendingRequests[roomId].findIndex((u) => u.id === userId);
    if (idx === -1) return;

    const [user] = pendingRequests[roomId].splice(idx, 1);
    io.to(user.id).emit("rejected", { reason: "Host rejected your request" });

    io.to(host.id).emit("pending-requests", pendingRequests[roomId]);
  });

  // signaling handlers
  socket.on("offer", (data) => {
    if (!data.to) return;
    io.to(data.to).emit("offer", { from: socket.id, offer: data.offer });
  });

  socket.on("answer", (data) => {
    if (!data.to) return;
    io.to(data.to).emit("answer", { from: socket.id, answer: data.answer });
  });

  socket.on("ice-candidate", (data) => {
    if (!data.to) return;
    io.to(data.to).emit("ice-candidate", {
      from: socket.id,
      candidate: data.candidate
    });
  });

  socket.on("disconnect", () => {
    console.log("[SERVER] disconnect:", socket.id);

    // Remove from roomUsers
    for (const rid of Object.keys(roomUsers)) {
      const idx = roomUsers[rid].findIndex((u) => u.id === socket.id);
      if (idx !== -1) {
        const wasHost = idx === 0;
        roomUsers[rid].splice(idx, 1);

        io.in(rid).emit("user-left", socket.id);

        if (wasHost && roomUsers[rid].length > 0) {
          const newHost = roomUsers[rid][0];
          io.to(newHost.id).emit("you-are-host");
          io.to(newHost.id).emit("pending-requests", pendingRequests[rid] || []);
          console.log("[SERVER] Host transferred to:", newHost.id);
        }

        break;
      }
    }

    // Remove from pendingRequests
    for (const rid of Object.keys(pendingRequests)) {
      const idx = pendingRequests[rid].findIndex((u) => u.id === socket.id);
      if (idx !== -1) {
        pendingRequests[rid].splice(idx, 1);
        const host = roomUsers[rid] && roomUsers[rid][0];
        if (host) io.to(host.id).emit("pending-requests", pendingRequests[rid] || []);
        break;
      }
    }

    // clean empty rooms
    for (const rid of Object.keys(roomUsers)) {
      const active = io.sockets.adapter.rooms.get(rid);
      if (!active || active.size === 0) {
        console.log("[SERVER] Cleaning empty room:", rid);
        delete roomUsers[rid];
        delete pendingRequests[rid];
      }
    }
  });

});

app.get("/", (req, res) => res.send("Backend running"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Backend listening on " + PORT));
