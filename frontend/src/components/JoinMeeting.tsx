import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Socket } from "socket.io-client";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JoinMeetingProps {
  socket: Socket;
}

export const JoinMeeting: React.FC<JoinMeetingProps> = ({ socket }) => {
  const [meetingId, setMeetingId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleJoinMeeting = () => {
    if (!meetingId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a meeting ID",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    socket.emit(
      "join-room",
      meetingId,
      (response: { error?: string; success?: boolean }) => {
        setIsJoining(false);

        if (response.error) {
          toast({
            title: "Error",
            description: response.error,
            variant: "destructive",
          });
          return;
        }

        navigate(`/room/${meetingId}`);
      }
    );
  };

  return (
    <Card className="w-full md:w-[400px] bg-white/10 backdrop-blur-lg border-gray-800">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6" />
          Join Meeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Enter meeting ID"
          value={meetingId}
          onChange={(e) => setMeetingId(e.target.value)}
          disabled={isJoining}
          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
        />
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          onClick={handleJoinMeeting}
          disabled={isJoining}
        >
          {isJoining ? "Joining..." : "Join Meeting"}
        </Button>
      </CardContent>
    </Card>
  );
};
