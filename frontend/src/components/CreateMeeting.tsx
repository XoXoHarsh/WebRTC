import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Socket } from "socket.io-client";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Copy, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreateMeetingProps {
  socket: Socket;
  setIsHost: React.Dispatch<React.SetStateAction<boolean>>;
}

export const CreateMeeting: React.FC<CreateMeetingProps> = ({
  socket,
  setIsHost,
}) => {
  const [roomId, setRoomId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreateMeeting = () => {
    setIsCreating(true);
    socket.emit("create-room", (newRoomId: string) => {
      setRoomId(newRoomId);
      setIsHost(true);
      navigate(`/room/${newRoomId}`);
    });
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: "Copied!",
      description: "Room ID copied to clipboard",
    });
  };

  return (
    <Card className="w-full md:w-[400px] bg-white/10 backdrop-blur-lg border-gray-800">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
          <Video className="w-6 h-6" />
          Create Meeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {roomId && (
          <div className="p-4 bg-gray-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Meeting ID:</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyRoomId}
                className="h-8 px-2 text-gray-400 hover:text-white"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="font-mono text-lg text-white">{roomId}</p>
          </div>
        )}
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleCreateMeeting}
          disabled={isCreating}
        >
          {isCreating ? "Creating..." : "Create New Meeting"}
        </Button>
      </CardContent>
    </Card>
  );
};
