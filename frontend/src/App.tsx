// client/src/App.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { CreateMeeting } from "./components/CreateMeeting";
import { JoinMeeting } from "./components/JoinMeeting";
import VideoRoom from "./components/VideoRoom";
import { Toaster } from "./components/ui/toaster";

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(`${import.meta.env.VITE_SERVER_URL}`);
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  if (!socket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Connecting...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Routes>
          <Route
            path="/"
            element={
              <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-4xl mx-auto">
                  <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-2">
                    Video Chat
                  </h1>
                  <p className="text-gray-400 text-center mb-8">
                    Create or join a meeting with just one click
                  </p>
                  <div className="flex flex-col md:flex-row gap-4 md:gap-8 justify-center">
                    <CreateMeeting socket={socket} />
                    <JoinMeeting socket={socket} />
                  </div>
                </div>
              </div>
            }
          />
          <Route path="/room/:roomId" element={<VideoRoom socket={socket} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
