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
  private roomId: string;
  private pendingCandidates: RTCIceCandidate[] = [];
  private onConnectionStateChange?: (connected: boolean) => void;

  constructor(
    socket: Socket,
    remoteVideoRef: React.RefObject<HTMLVideoElement>,
    roomId: string,
    onConnectionStateChange?: (connected: boolean) => void
  ) {
    this.socket = socket;
    this.remoteVideoRef = remoteVideoRef;
    this.roomId = roomId;
    this.onConnectionStateChange = onConnectionStateChange;
    this.peerConnection = new RTCPeerConnection(configuration);

    this.setupPeerConnectionListeners();
    this.setupSocketListeners();
  }

  setupPeerConnectionListeners() {
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Generated ICE candidate: ", event.candidate);
        this.socket.emit("ice-candidate", {
          to: this.roomId,
          candidate: event.candidate,
        });
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log(
        "ICE connection state change: ",
        this.peerConnection.iceConnectionState
      );

      if (this.onConnectionStateChange) {
        const connected =
          this.peerConnection.iceConnectionState === "connected" ||
          this.peerConnection.iceConnectionState === "completed";
        this.onConnectionStateChange(connected);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log(
        "Connection state change: ",
        this.peerConnection.connectionState
      );
    };

    this.peerConnection.ontrack = (event) => {
      console.log("Received remote track: ", event.track.kind);

      if (!this.remoteVideoRef.current) {
        console.error("No remote video element found");
        return;
      }

      // Get the first stream from the event
      const [remoteStream] = event.streams;
      if (!remoteStream) {
        console.error("No remote stream found in track event");
        return;
      }

      // Set the stream only if it's different from the current one
      if (this.remoteVideoRef.current.srcObject !== remoteStream) {
        console.log("Setting new remote stream");
        this.remoteVideoRef.current.srcObject = remoteStream;
      }

      // Monitor track ending
      event.track.onended = () => {
        console.log(`Remote ${event.track.kind} track ended`);
      };

      // Monitor track muting
      event.track.onmute = () => {
        console.log(`Remote ${event.track.kind} track muted`);
      };

      event.track.onunmute = () => {
        console.log(`Remote ${event.track.kind} track unmuted`);
      };

      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(true);
      }
    };
  }

  private setupSocketListeners() {
    this.socket.on("ice-candidate", async ({ candidate }) => {
      try {
        console.log("Received ICE candidate: ", candidate);
        if (this.peerConnection.remoteDescription) {
          await this.peerConnection.addIceCandidate(candidate);
        } else {
          // Store candidates received before remote description
          this.pendingCandidates.push(candidate);
        }
      } catch (error) {
        console.log("Error handling ICE candidate: ", error);
      }
    });
  }

  private async addPendingCandidates() {
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        await this.peerConnection.addIceCandidate(candidate);
      }
    }
  }

  async initializeLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("Got local stream: ", this.localStream);

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

  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true,
      });
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error;
    }
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    try {
      if (this.peerConnection.signalingState !== "stable") {
        console.warn("Signaling state is not stable, resetting connection");
        await this.peerConnection.setLocalDescription({ type: "rollback" });
      }

      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      await this.addPendingCandidates();

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      return answer;
    } catch (error) {
      console.error("Error handling offer:", error);
      throw error;
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    try {
      // Check if we can set the remote description
      if (this.peerConnection.signalingState === "stable") {
        console.warn(
          "Signaling state is stable, may already have remote description"
        );
        return;
      }

      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      console.log("Successfully set remote description from answer");
      await this.addPendingCandidates();
    } catch (error) {
      console.error("Error handling answer:", error);
      throw error;
    }
  }

  cleanup() {
    console.log("Cleaning up WebRTC connection");
    this.socket.off("ice-candidate");

    // Properly clean up the remote video
    if (this.remoteVideoRef.current) {
      this.remoteVideoRef.current.srcObject = null;
    }

    // Stop all local tracks
    this.localStream?.getTracks().forEach((track) => {
      track.stop();
      console.log(`Stopped local ${track.kind} track`);
    });

    // Close the peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      console.log("Closed peer connection");
    }

    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(false);
    }
  }
}
