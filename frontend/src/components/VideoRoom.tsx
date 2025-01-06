// client/src/components/VideoRoom.tsx
import React, { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { WebRTCConnection } from "../lib/webrtc";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import {
  Copy,
  Loader2,
  MicOff,
  Mic,
  Video,
  VideoOff,
  X,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";

interface VideoRoomProps {
  socket: Socket;
}

const VideoRoom: React.FC<VideoRoomProps> = ({ socket }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [webrtc, setWebrtc] = useState<WebRTCConnection | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isRemoteConnected, setIsRemoteConnected] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { roomId } = useParams();

  useEffect(() => {
    const initializeRoom = async () => {
      const connection = new WebRTCConnection(socket, remoteVideoRef);
      setWebrtc(connection);

      try {
        const stream = await connection.initializeLocalStream();
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsConnecting(false);
      } catch (error) {
        console.error("Failed to access media devices:", error);
        toast({
          title: "Error",
          description: "Failed to access camera or microphone",
          variant: "destructive",
        });
        setIsConnecting(false);
      }
    };

    initializeRoom();

    socket.on("user-joined", () => {
      setIsRemoteConnected(true);
      toast({
        title: "User Connected",
        description: "Another participant has joined the meeting",
      });
    });

    socket.on("user-left", () => {
      setIsRemoteConnected(false);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      toast({
        title: "User Disconnected",
        description: "The other participant has left the meeting",
      });
    });

    return () => {
      socket.off("user-joined");
      socket.off("user-left");
      webrtc?.cleanup();
    };
  }, [socket, roomId]);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId!);
    toast({
      title: "Copied!",
      description: "Room ID copied to clipboard",
    });
  };

  const handleLeave = () => {
    webrtc?.cleanup();
    navigate("/");
  };

  const toggleMute = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);

      toast({
        title: isMuted ? "Microphone Unmuted" : "Microphone Muted",
        description: isMuted
          ? "Others can now hear you"
          : "Others cannot hear you",
      });
    }
  };

  const toggleVideo = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);

      toast({
        title: isVideoOff ? "Camera On" : "Camera Off",
        description: isVideoOff
          ? "Others can now see you"
          : "Others cannot see you",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-6">
      {/* Room ID Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="glass-morphism rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Room ID:</span>
              <span className="font-mono text-white">{roomId}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyRoomId}
              className="hover:bg-white/20"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 rounded-full bg-green-500/20 text-green-300 text-sm">
              {isRemoteConnected ? "Connected" : "Waiting for peer"}
            </div>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Local Video */}
          <div className="video-container group">
            {isConnecting ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            ) : (
              <>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={isVideoOff ? "hidden" : ""}
                />
                {isVideoOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <VideoOff className="w-16 h-16 text-gray-600" />
                  </div>
                )}
                <div className="video-overlay opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="text-white text-sm bg-black/50 px-3 py-1.5 rounded-full flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isMuted ? "bg-red-500" : "bg-green-500"
                      }`}
                    />
                    You {isMuted && "(Muted)"}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Remote Video */}
          <div className="video-container group">
            {!isRemoteConnected ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
                <Users className="w-16 h-16 text-gray-600 mb-4" />
                <p className="text-gray-400 text-center">
                  Waiting for others to join...
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Share the room ID to invite others
                </p>
              </div>
            ) : (
              <>
                <video ref={remoteVideoRef} autoPlay playsInline />
                <div className="video-overlay opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-4 left-4 text-white text-sm bg-black/50 px-3 py-1.5 rounded-full">
                  Remote User
                </div>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex justify-center gap-4">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            onClick={toggleMute}
            className="control-button hover:scale-110 transition-transform"
          >
            {isMuted ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant={isVideoOff ? "destructive" : "secondary"}
            onClick={toggleVideo}
            className="control-button hover:scale-110 transition-transform"
          >
            {isVideoOff ? (
              <VideoOff className="h-5 w-5" />
            ) : (
              <Video className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={handleLeave}
            className="control-button hover:scale-110 transition-transform"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoRoom;
