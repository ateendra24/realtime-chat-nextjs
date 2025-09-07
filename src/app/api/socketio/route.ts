import { NextRequest, NextResponse } from "next/server";
import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";
import * as net from "net";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
    // Initialize Socket.IO server if not already done
    if (!global.io) {
        console.log("Initializing Socket.IO server...");

        try {
            // Create a standalone Socket.IO server for Next.js App Router
            const server = createServer();

            global.io = new SocketIOServer(server, {
                cors: {
                    origin: process.env.NODE_ENV === "development" ? ["http://localhost:3000", "http://localhost:3001"] : "*",
                    methods: ["GET", "POST"]
                },
                transports: ['websocket', 'polling']
            });

            const io = global.io;

            io.on("connection", (socket) => {
                console.log("User connected:", socket.id);

                // Handle joining chat rooms
                socket.on("join_chat", (chatId: string) => {
                    console.log(`User ${socket.id} joined chat ${chatId}`);
                    socket.join(`chat_${chatId}`);
                    console.log(`User ${socket.id} successfully joined room: chat_${chatId}`);
                });

                // Handle leaving chat rooms
                socket.on("leave_chat", (chatId: string) => {
                    console.log(`User ${socket.id} leaving chat ${chatId}`);
                    socket.leave(`chat_${chatId}`);
                    console.log(`User ${socket.id} successfully left room: chat_${chatId}`);
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

                // Handle chat list updates
                socket.on("chat_list_update", async (data) => {
                    console.log("Chat list update received:", data);
                    // Broadcast to all participants in the chat to refresh their chat lists
                    if (global.io && data.chatId) {
                        global.io.to(data.chatId).emit("chat_list_update", data);
                    }
                });

                // Handle global chat list updates
                socket.on("global_chat_list_update", async (data) => {
                    console.log("Global chat list update received:", data);
                    // Broadcast to all connected clients to refresh their chat lists
                    if (global.io) {
                        global.io.emit("global_chat_list_update", data);
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

            // Start the Socket.IO server on port 3004
            const PORT = process.env.SOCKET_PORT || 3004;

            // Check if port is available before listening
            const testServer = net.createServer();

            testServer.listen(PORT, () => {
                testServer.close(() => {
                    server.listen(PORT, () => {
                        console.log(`Socket.IO server running on port ${PORT}`);
                    });
                });
            });

            testServer.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`Port ${PORT} is already in use, Socket.IO server may already be running`);
                } else {
                    console.error("Error testing port:", err);
                }
            });

        } catch (error) {
            console.error("Error initializing Socket.IO server:", error);
            return new NextResponse("Error initializing Socket.IO server", { status: 500 });
        }
    } else {
        console.log("Socket.IO server already initialized");
    }

    return new NextResponse("Socket.IO server initialized", { status: 200 });
}
