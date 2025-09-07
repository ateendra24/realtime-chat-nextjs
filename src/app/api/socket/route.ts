import { NextRequest, NextResponse } from "next/server";
import { Server } from "socket.io";
import { createServer } from "http";

interface ExtendedNextRequest extends NextRequest {
  socket?: {
    server?: unknown;
  };
}

export async function GET(req: ExtendedNextRequest) {
  // This will initialize Socket.IO server
  if (!global.io) {
    console.log("Setting up Socket.IO server...");

    const httpServer = req.socket?.server;

    if (httpServer) {
      global.io = new Server(httpServer, {
        path: "/api/socket",
        addTrailingSlash: false,
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });

      global.io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        // Handle joining chat rooms
        socket.on("join_chat", (chatId: string) => {
          console.log(`User ${socket.id} joined chat ${chatId}`);
          socket.join(chatId);
        });

        // Handle leaving chat rooms
        socket.on("leave_chat", (chatId: string) => {
          console.log(`User ${socket.id} left chat ${chatId}`);
          socket.leave(chatId);
        });

        // Handle incoming messages
        socket.on("message", async (msg) => {
          console.log("Message received:", msg);
          // Broadcast message to all clients in the chat room
          if (global.io && msg.chatId) {
            global.io.to(msg.chatId).emit("message", msg);
          }
        });

        // Handle reaction updates
        socket.on("reaction_update", async (data) => {
          console.log("Reaction update received:", data);
          // Broadcast reaction update to all clients in the chat room
          if (global.io && data.chatId) {
            global.io.to(data.chatId).emit("reaction_update", data);
          }
        });

        // Handle user typing events
        socket.on("typing_start", (data: { chatId: string; userId: string; username: string }) => {
          console.log("User started typing:", data);
          socket.to(data.chatId).emit("typing_start", data);
        });

        socket.on("typing_stop", (data: { chatId: string; userId: string }) => {
          console.log("User stopped typing:", data);
          socket.to(data.chatId).emit("typing_stop", data);
        });

        // Handle user presence updates
        socket.on("user_online", (userId: string) => {
          console.log("User online:", userId);
          socket.broadcast.emit("user_online", userId);
        });

        socket.on("user_offline", (userId: string) => {
          console.log("User offline:", userId);
          socket.broadcast.emit("user_offline", userId);
        });

        socket.on("disconnect", () => {
          console.log("User disconnected:", socket.id);
        });
      });
    } else {
      console.log("HTTP server not available, creating standalone Socket.IO server");
      // Fallback for development - create standalone server
      const server = createServer();

      global.io = new Server(server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });

      // Copy the same event handlers
      global.io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        socket.on("join_chat", (chatId: string) => {
          console.log(`User ${socket.id} joined chat ${chatId}`);
          socket.join(chatId);
        });

        socket.on("leave_chat", (chatId: string) => {
          console.log(`User ${socket.id} left chat ${chatId}`);
          socket.leave(chatId);
        });

        socket.on("message", async (msg) => {
          console.log("Message received:", msg);
          if (global.io && msg.chatId) {
            global.io.to(msg.chatId).emit("message", msg);
          }
        });

        socket.on("reaction_update", async (data) => {
          console.log("Reaction update received:", data);
          if (global.io && data.chatId) {
            global.io.to(data.chatId).emit("reaction_update", data);
          }
        });

        socket.on("typing_start", (data: { chatId: string; userId: string; username: string }) => {
          socket.to(data.chatId).emit("typing_start", data);
        });

        socket.on("typing_stop", (data: { chatId: string; userId: string }) => {
          socket.to(data.chatId).emit("typing_stop", data);
        });

        socket.on("user_online", (userId: string) => {
          socket.broadcast.emit("user_online", userId);
        });

        socket.on("user_offline", (userId: string) => {
          socket.broadcast.emit("user_offline", userId);
        });

        socket.on("disconnect", () => {
          console.log("User disconnected:", socket.id);
        });
      });

      server.listen(3001, () => {
        console.log("Socket.IO server running on port 3001");
      });
    }
  }

  return new NextResponse("Socket.IO server running", { status: 200 });
}
