// lib/socket.js
import { io } from "socket.io-client";

let socket = null;

export function initSocket() {
  // ⭐ Always create fresh socket to avoid stale state
  if (socket) {
    // If already connected, return existing socket
    if (socket.connected) {
      console.log("[SOCKET] Reusing existing connected socket:", socket.id);
      return socket;
    }
    // If disconnected, clean up and create new
    console.log("[SOCKET] Socket exists but not connected, cleaning up...");
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  console.log("[SOCKET] Creating new socket connection...");
  
  socket = io("https://polymeet.onrender.com", {
    transports: ["websocket"],
    upgrade: false,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000,
    forceNew: false,  // ⭐ Reuse connection
  });

  socket.on("connect", () => {
    console.log("[SOCKET] ✅ Connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[SOCKET] ❌ Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.log("[SOCKET] ❌ Connection error:", err.message);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    console.log("[SOCKET] Disconnecting socket...");
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}