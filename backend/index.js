// index.js — FIXED BACKEND
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

// ⭐ ALLOWED ORIGINS - Add all your frontend URLs here
const ALLOWED_ORIGINS = [
  "https://polymeet-three.vercel.app",    // ✅ Your NEW Vercel URL
  "https://live-meeting-ten.vercel.app",  // Old URL (keep for backup)
  "http://localhost:3000",                 // Local development
];

// Manual CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // ⭐ Check if origin is allowed
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

const server = http.createServer(app);

// ⭐ Socket.IO with CORRECT CORS
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,  // ✅ Use the array
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
  },
  transports: ["websocket"],
  pingTimeout: 60000,      // ⭐ Increase timeout
  pingInterval: 25000,     // ⭐ Keep connection alive
});

// ROOM STATE
const roomUsers = {};
const pendingRequests = {};

function ensureRoom(roomId) {
  if (!roomUsers[roomId]) roomUsers[roomId] = [];
  if (!pendingRequests[roomId]) pendingRequests[roomId] = [];
}

// SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("[SERVER] ✅ connected:", socket.id);

  // ⭐ JOIN REQUEST
  socket.on("join-request", ({ roomId, username }) => {
    if (!roomId || !username) {
      console.log("[SERVER] ❌ Invalid join-request - missing roomId or username");
      return;
    }

    console.log("[SERVER] 📥 join-request:", socket.id, "room:", roomId, "user:", username);
    ensureRoom(roomId);

    // First user = HOST
    if (roomUsers[roomId].length === 0) {
      roomUsers[roomId].push({ id: socket.id, username });
      socket.join(roomId);

      console.log("[SERVER] 👑 Making user HOST:", socket.id);
      
      io.to(socket.id).emit("you-are-host");
      io.to(socket.id).emit("room-users", roomUsers[roomId]);
      return;
    }

    // Not first user → waiting room
    console.log("[SERVER] ⏳ Adding to waiting room:", socket.id);
    pendingRequests[roomId].push({ id: socket.id, username });

    io.to(socket.id).emit("waiting-for-host");

    // Notify host
    const host = roomUsers[roomId][0];
    io.to(host.id).emit("pending-requests", pendingRequests[roomId]);
  });

  // HOST ADMITS USER
  socket.on("admit-user", ({ roomId, userId }) => {
    console.log("[SERVER] ✅ admit-user:", userId, "by:", socket.id);
    ensureRoom(roomId);

    const host = roomUsers[roomId][0];
    if (!host || host.id !== socket.id) {
      console.log("[SERVER] ❌ Not host, ignoring admit");
      return;
    }

    const idx = pendingRequests[roomId].findIndex((u) => u.id === userId);
    if (idx === -1) {
      console.log("[SERVER] ❌ User not in pending list");
      return;
    }

    const [user] = pendingRequests[roomId].splice(idx, 1);
    roomUsers[roomId].push(user);

    // Join the room
    const userSocket = io.sockets.sockets.get(userId);
    if (userSocket) {
      userSocket.join(roomId);
    }

    io.to(user.id).emit("admitted", { roomId, users: roomUsers[roomId] });
    io.in(roomId).emit("room-users", roomUsers[roomId]);

    // Notify others about new user
    roomUsers[roomId].forEach((u) => {
      if (u.id !== user.id) {
        io.to(u.id).emit("user-joined", { id: user.id, username: user.username });
      }
    });

    io.to(host.id).emit("pending-requests", pendingRequests[roomId]);
  });

  // REJECT USER
  socket.on("reject-user", ({ roomId, userId }) => {
    console.log("[SERVER] ❌ reject-user:", userId);
    ensureRoom(roomId);

    const host = roomUsers[roomId][0];
    if (!host || host.id !== socket.id) return;

    const idx = pendingRequests[roomId].findIndex((u) => u.id === userId);
    if (idx !== -1) {
      pendingRequests[roomId].splice(idx, 1);
      io.to(userId).emit("rejected", { reason: "Host rejected your request" });
      io.to(host.id).emit("pending-requests", pendingRequests[roomId]);
    }
  });

  // SIGNALING
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

  // DISCONNECT
  socket.on("disconnect", (reason) => {
    console.log("[SERVER] ❌ disconnect:", socket.id, "reason:", reason);

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
          console.log("[SERVER] 👑 Host transferred to:", newHost.id);
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
        if (host) {
          io.to(host.id).emit("pending-requests", pendingRequests[rid] || []);
        }
        break;
      }
    }

    // Clean empty rooms
    for (const rid of Object.keys(roomUsers)) {
      if (roomUsers[rid].length === 0) {
        console.log("[SERVER] 🧹 Cleaning empty room:", rid);
        delete roomUsers[rid];
        delete pendingRequests[rid];
      }
    }
  });
});

app.get("/", (req, res) => res.send("Backend running ✅"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("✅ Backend listening on port " + PORT));