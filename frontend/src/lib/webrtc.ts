// client/src/lib/webrtc.ts
import { Socket } from "socket.io-client";

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // Add TURN servers for production
  ],
};

export class WebRTCConnection {
  private peerConnection: RTCPeerConnection;
  private socket: Socket;
  private remoteVideoRef: React.RefObject<HTMLVideoElement>;
  private localStream?: MediaStream;

  constructor(
    socket: Socket,
    remoteVideoRef: React.RefObject<HTMLVideoElement>
  ) {
    this.socket = socket;
    this.remoteVideoRef = remoteVideoRef;
    this.peerConnection = new RTCPeerConnection(configuration);

    this.setupPeerConnectionListeners();
  }

  private setupPeerConnectionListeners() {
    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit("ice-candidate", {
          to: this.socket.id,
          candidate: event.candidate,
        });
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (this.remoteVideoRef.current) {
        this.remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
  }

  // Initialize local stream and add tracks to peer connection
  async initializeLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      this.localStream.getTracks().forEach((track) => {
        if (this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      return this.localStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  }

  // Create and send offer
  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error;
    }
  }

  // Handle incoming offer and create answer
  async handleOffer(offer: RTCSessionDescriptionInit) {
    try {
      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      return answer;
    } catch (error) {
      console.error("Error handling offer:", error);
      throw error;
    }
  }

  // Handle incoming answer
  async handleAnswer(answer: RTCSessionDescriptionInit) {
    try {
      await this.peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error("Error handling answer:", error);
      throw error;
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
      throw error;
    }
  }

  // Cleanup
  cleanup() {
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.peerConnection.close();
  }
}
