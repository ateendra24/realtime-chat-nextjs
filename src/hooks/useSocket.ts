"use client";
import { io, Socket } from "socket.io-client";
import { useEffect, useState } from "react";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initSocket = async () => {
      try {
        // In production, disable Socket.IO since it doesn't work with Vercel serverless
        if (process.env.NODE_ENV === 'production') {
          console.log('Production mode: Socket.IO disabled for serverless compatibility');
          setSocket(null);
          setIsConnected(false);
          return;
        }

        // Initialize socket server first (development only)
        await fetch("/api/socketio");

        // Wait a bit for the server to start
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Connect to Socket.IO server (development only)
        const socketIo = io(`http://localhost:${process.env.NEXT_PUBLIC_SOCKET_PORT || 3004}`, {
          transports: ['polling', 'websocket'], // Try polling first, then websocket
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          timeout: 20000,
          forceNew: true
        });

        socketIo.on("connect", () => {
          console.log("Connected to Socket.IO server:", socketIo.id);
          setIsConnected(true);
        });

        socketIo.on("disconnect", () => {
          console.log("Disconnected from Socket.IO server");
          setIsConnected(false);
        });

        socketIo.on("connect_error", (error) => {
          console.error("Socket.IO connection error:", error);
          setIsConnected(false);
        });

        socketIo.on("reconnect", () => {
          console.log("Reconnected to Socket.IO server");
          setIsConnected(true);
        });

        socketIo.on("reconnect_error", (error) => {
          console.error("Socket.IO reconnection error:", error);
        });

        setSocket(socketIo);

      } catch (error) {
        console.error("Failed to initialize socket:", error);
      }
    };

    initSocket();
  }, []);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return { socket, isConnected };
}
