// lib/socket.js
import { io } from "socket.io-client";

let socket = null;

export function initSocket() {
  // If socket exists and is connected, return it
  if (socket && socket.connected) {
    return socket;
  }

  // If socket exists but disconnected, clean it up
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // Create new socket
  socket = io("https://polymeet.onrender.com", {
    transports: ["websocket"],
    upgrade: false,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    timeout: 20000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}