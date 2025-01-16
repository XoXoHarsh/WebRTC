import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { randomUUID } from "crypto";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
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

  socket.on("create-room", (callback) => {
    const roomId = randomUUID();
    rooms.set(roomId, { id: roomId, participants: [socket.id] });
    console.log("Room created:", roomId);
    console.log("Participants:", rooms.get(roomId)?.participants);
    socket.join(roomId);
    callback(roomId);
  });

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
    console.log("Joining room:", roomId);
    console.log("Participants:", room.participants);
    socket.join(roomId);
    callback({ success: true });
  });

  socket.on("peer-ready", (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const host = room.participants[0];
    console.log("Peer is ready, notifying host:", host);
    io.to(host).emit("user-joined");
  });

  socket.on("offer", ({ to, offer }) => {
    // Send offer to all clients in the room except sender
    console.log("send offer to all client", to);
    socket.to(to).emit("offer", { offer });
  });

  socket.on("answer", ({ to, answer }) => {
    // Send answer to all clients in the room except sender
    socket.to(to).emit("answer", { answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    socket.to(to).emit("ice-candidate", { candidate });
  });

  socket.on("disconnect", () => {
    rooms.forEach((room, roomId) => {
      const index = room.participants.indexOf(socket.id);
      if (index !== -1) {
        room.participants.splice(index, 1);
        if (room.participants.length === 0) {
          rooms.delete(roomId);
        } else {
          // Notify remaining participants
          io.to(roomId).emit("user-left");
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
