// backend/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

const ALLOWED_ORIGINS = [
  "https://polymeet-three.vercel.app",
  "https://live-meeting-ten.vercel.app",
  "http://localhost:3000",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
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
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  },
  transports: ["websocket"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ROOM STATE
const roomUsers = {};       // roomId → [{id, username, isHost}]
const pendingRequests = {}; // roomId → waiting users
const roomHosts = {};       // roomId → hostSocketId (⭐ Track original host)

function ensureRoom(roomId) {
  if (!roomUsers[roomId]) roomUsers[roomId] = [];
  if (!pendingRequests[roomId]) pendingRequests[roomId] = [];
}

// ⭐ End meeting for all participants
function endMeetingForAll(roomId, reason = "Host ended the meeting") {
  console.log("[SERVER] 🔴 Ending meeting for room:", roomId);
  
  // Notify all users in the room
  io.in(roomId).emit("meeting-ended", { reason });
  
  // Notify pending users
  if (pendingRequests[roomId]) {
    pendingRequests[roomId].forEach((u) => {
      io.to(u.id).emit("meeting-ended", { reason });
    });
  }
  
  // Clean up room data
  delete roomUsers[roomId];
  delete pendingRequests[roomId];
  delete roomHosts[roomId];
  
  console.log("[SERVER] 🧹 Room cleaned:", roomId);
}

io.on("connection", (socket) => {
  console.log("[SERVER] ✅ connected:", socket.id);

  // ⭐ JOIN REQUEST
  socket.on("join-request", ({ roomId, username }) => {
    if (!roomId || !username) {
      console.log("[SERVER] ❌ Invalid join-request");
      return;
    }

    console.log("[SERVER] 📥 join-request:", socket.id, "room:", roomId);
    ensureRoom(roomId);

    // First user = HOST
    if (roomUsers[roomId].length === 0) {
      const hostUser = { id: socket.id, username, isHost: true };
      roomUsers[roomId].push(hostUser);
      roomHosts[roomId] = socket.id; // ⭐ Track original host
      socket.join(roomId);

      console.log("[SERVER] 👑 Making HOST:", socket.id);
      io.to(socket.id).emit("you-are-host");
      io.to(socket.id).emit("room-users", roomUsers[roomId]);
      return;
    }

    // Not first user → waiting room
    console.log("[SERVER] ⏳ Adding to waiting:", socket.id);
    pendingRequests[roomId].push({ id: socket.id, username });
    io.to(socket.id).emit("waiting-for-host");

    // Notify host
    const host = roomUsers[roomId].find((u) => u.isHost);
    if (host) {
      io.to(host.id).emit("pending-requests", pendingRequests[roomId]);
    }
  });

  // ⭐ HOST ADMITS USER
  socket.on("admit-user", ({ roomId, userId }) => {
    console.log("[SERVER] ✅ admit-user:", userId);
    ensureRoom(roomId);

    // Verify sender is host
    const host = roomUsers[roomId].find((u) => u.isHost);
    if (!host || host.id !== socket.id) {
      console.log("[SERVER] ❌ Not host, ignoring");
      return;
    }

    const idx = pendingRequests[roomId].findIndex((u) => u.id === userId);
    if (idx === -1) return;

    const [user] = pendingRequests[roomId].splice(idx, 1);
    const newUser = { ...user, isHost: false }; // ⭐ Regular user, not host
    roomUsers[roomId].push(newUser);

    const userSocket = io.sockets.sockets.get(userId);
    if (userSocket) userSocket.join(roomId);

    io.to(user.id).emit("admitted", { roomId, users: roomUsers[roomId] });
    io.in(roomId).emit("room-users", roomUsers[roomId]);

    roomUsers[roomId].forEach((u) => {
      if (u.id !== user.id) {
        io.to(u.id).emit("user-joined", { id: user.id, username: user.username });
      }
    });

    io.to(host.id).emit("pending-requests", pendingRequests[roomId]);
  });

  // ⭐ REJECT USER
  socket.on("reject-user", ({ roomId, userId }) => {
    console.log("[SERVER] ❌ reject-user:", userId);
    ensureRoom(roomId);

    const host = roomUsers[roomId].find((u) => u.isHost);
    if (!host || host.id !== socket.id) return;

    const idx = pendingRequests[roomId].findIndex((u) => u.id === userId);
    if (idx !== -1) {
      pendingRequests[roomId].splice(idx, 1);
      io.to(userId).emit("rejected", { reason: "Host rejected your request" });
      io.to(host.id).emit("pending-requests", pendingRequests[roomId]);
    }
  });

  // ⭐ HOST ENDS MEETING FOR ALL
  socket.on("end-meeting", ({ roomId }) => {
    console.log("[SERVER] 🔴 end-meeting requested by:", socket.id);
    
    if (!roomUsers[roomId]) return;
    
    const host = roomUsers[roomId].find((u) => u.isHost);
    if (!host || host.id !== socket.id) {
      console.log("[SERVER] ❌ Not host, cannot end meeting");
      return;
    }

    endMeetingForAll(roomId, "Host ended the meeting");
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
    io.to(data.to).emit("ice-candidate", { from: socket.id, candidate: data.candidate });
  });

  // ⭐ DISCONNECT
  socket.on("disconnect", (reason) => {
    console.log("[SERVER] ❌ disconnect:", socket.id, "reason:", reason);

    for (const rid of Object.keys(roomUsers)) {
      const idx = roomUsers[rid].findIndex((u) => u.id === socket.id);
      
      if (idx !== -1) {
        const user = roomUsers[rid][idx];
        const wasHost = user.isHost;

        // ⭐ If HOST leaves → END MEETING FOR ALL
        if (wasHost) {
          console.log("[SERVER] 👑 Host left, ending meeting for all");
          endMeetingForAll(rid, "Host left the meeting");
          return; // Room is deleted, no more processing needed
        }

        // Regular user leaves
        roomUsers[rid].splice(idx, 1);
        io.in(rid).emit("user-left", socket.id);
        io.in(rid).emit("room-users", roomUsers[rid]);

        // Notify host about updated user list
        const host = roomUsers[rid].find((u) => u.isHost);
        if (host) {
          io.to(host.id).emit("room-users", roomUsers[rid]);
        }
        break;
      }
    }

    // Remove from pending requests
    for (const rid of Object.keys(pendingRequests)) {
      const idx = pendingRequests[rid].findIndex((u) => u.id === socket.id);
      if (idx !== -1) {
        pendingRequests[rid].splice(idx, 1);
        const host = roomUsers[rid]?.find((u) => u.isHost);
        if (host) {
          io.to(host.id).emit("pending-requests", pendingRequests[rid]);
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
        delete roomHosts[rid];
      }
    }
  });
});

app.get("/", (req, res) => res.send("Backend running ✅"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("✅ Backend listening on port " + PORT));