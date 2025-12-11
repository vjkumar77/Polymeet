import { io } from "socket.io-client";
let socket;
export function initSocket() {
  if (!socket) {
    socket = io("https://polymeet.onrender.com", {
      transports: ["websocket"],
      upgrade: false,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      timeout: 20000,
    });
  }
  return socket;
}
