// server/src/server.ts
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { randomUUID } from "crypto";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"],
  },
});

interface Room {
  id: string;
  participants: string[];
}

const rooms = new Map<string, Room>();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Create a new meeting room
  socket.on("create-room", (callback) => {
    const roomId = randomUUID();
    rooms.set(roomId, { id: roomId, participants: [socket.id] });
    socket.join(roomId);
    callback(roomId);
  });

  // Join existing room
  socket.on("join-room", (roomId: string, callback) => {
    const room = rooms.get(roomId);
    if (!room) {
      callback({ error: "Room not found" });
      return;
    }

    if (room.participants.length >= 2) {
      callback({ error: "Room is full" });
      return;
    }

    room.participants.push(socket.id);
    socket.join(roomId);
    callback({ success: true });

    // Notify other participant
    socket.to(roomId).emit("user-joined", socket.id);
  });

  // Handle WebRTC signaling
  socket.on("offer", ({ to, offer }) => {
    socket.to(to).emit("offer", { from: socket.id, offer });
  });

  socket.on("answer", ({ to, answer }) => {
    socket.to(to).emit("answer", { from: socket.id, answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    socket.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    // Remove user from any room they're in
    rooms.forEach((room, roomId) => {
      const index = room.participants.indexOf(socket.id);
      if (index !== -1) {
        room.participants.splice(index, 1);
        if (room.participants.length === 0) {
          rooms.delete(roomId);
        }
        io.to(roomId).emit("user-left", socket.id);
      }
    });
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
