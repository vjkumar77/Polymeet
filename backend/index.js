// index.js — FINAL FIXED BACKEND
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

/* -------------------------
   FIX 1: REMOVE DEFAULT CORS
-------------------------- */
// ❌ DO NOT USE: app.use(cors());

/* ---------------------------------------
   FIX 2: MANUAL CORS + OPTIONS HANDLING
---------------------------------------- */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://live-meeting-ten.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

const server = http.createServer(app);

/* ---------------------------------------
   FIX 3: SOCKET.IO WITH FULL CORS + WS ONLY
---------------------------------------- */
const io = new Server(server, {
  cors: {
    origin: [
      "https://live-meeting-ten.vercel.app",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
  },
  transports: ["websocket"],  // ⭐ FORCE WEBSOCKET
});


/* ---------------------------------------
   ROOM STATE
---------------------------------------- */
const roomUsers = {};       // roomId → [{id, username}]
const pendingRequests = {}; // roomId → waiting users

function ensureRoom(roomId) {
  if (!roomUsers[roomId]) roomUsers[roomId] = [];
  if (!pendingRequests[roomId]) pendingRequests[roomId] = [];
}

/* ---------------------------------------
   SOCKET CONNECTION
---------------------------------------- */
io.on("connection", (socket) => {
  console.log("[SERVER] connected:", socket.id);

  /* -------------------------
     JOIN REQUEST
  ------------------------- */
  socket.on("join-request", ({ roomId, username }) => {
    if (!roomId || !username) return;

    console.log("[SERVER] join-request:", socket.id);
    ensureRoom(roomId);

    // host = first user
    if (roomUsers[roomId].length === 0) {
      roomUsers[roomId].push({ id: socket.id, username });
      socket.join(roomId);

      io.to(socket.id).emit("you-are-host");
      io.to(socket.id).emit("room-users", roomUsers[roomId]);
      return;
    }

    // normal user → waiting room
    pendingRequests[roomId].push({ id: socket.id, username });

    io.to(socket.id).emit("waiting-for-host");

    // notify host
    const host = roomUsers[roomId][0];
    io.to(host.id).emit("pending-requests", pendingRequests[roomId]);
  });


  /* -------------------------
     HOST ADMITS USER
  ------------------------- */
  socket.on("admit-user", ({ roomId, userId }) => {
    ensureRoom(roomId);

    const host = roomUsers[roomId][0];
    if (host.id !== socket.id) return;

    const idx = pendingRequests[roomId].findIndex((u) => u.id === userId);
    if (idx === -1) return;

    const [user] = pendingRequests[roomId].splice(idx, 1);

    roomUsers[roomId].push(user);

    io.to(user.id).socketsJoin(roomId);

    io.to(user.id).emit("admitted", { roomId, users: roomUsers[roomId] });

    io.in(roomId).emit("room-users", roomUsers[roomId]);

    // notify others to start WebRTC offer/answer
    roomUsers[roomId].forEach((u) => {
      if (u.id !== user.id) {
        io.to(u.id).emit("user-joined", { id: user.id, username: user.username });
      }
    });

    io.to(host.id).emit("pending-requests", pendingRequests[roomId]);
  });


  /* -------------------------
     SIGNALING
  ------------------------- */
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


  /* -------------------------
     DISCONNECT
  ------------------------- */
  socket.on("disconnect", () => {
  console.log("[SERVER] disconnect:", socket.id);

  // Remove from roomUsers
  for (const rid of Object.keys(roomUsers)) {
    const idx = roomUsers[rid].findIndex((u) => u.id === socket.id);
    if (idx !== -1) {
      const wasHost = idx === 0;
      roomUsers[rid].splice(idx, 1);

      io.in(rid).emit("user-left", socket.id);

      // Transfer host if needed
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

  // FINAL — delete empty rooms
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
