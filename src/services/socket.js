import { io } from "socket.io-client";

const WS_URL = process.env.REACT_APP_WS_URL || process.env.REACT_APP_API_URL || "http://localhost:4000";

let socketInstance = null;

export function connectSocket(token) {
  if (socketInstance?.connected) {
    return socketInstance;
  }

  socketInstance = io(WS_URL, {
    autoConnect: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    auth: token ? { token } : undefined
  });

  return socketInstance;
}

export function getSocket() {
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export { WS_URL };

