import { io } from "socket.io-client";

let socket;

export function initSocket() {
  if (!socket) {
    socket = io("https://live-meeting-backend.onrender.com", {
      transports: ["websocket"], // ⭐ only websocket
      upgrade: false,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      timeout: 20000,
    });
  }
  return socket;
}
