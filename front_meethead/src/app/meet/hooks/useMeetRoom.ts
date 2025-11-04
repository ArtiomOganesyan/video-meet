"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import Peer from "simple-peer";
import type { SignalData } from "simple-peer";

import { NEST_SERVER_URL } from "../constants";
import type { ChatMessage, PeerInfo, RoomUser } from "../types";

// Assumed type, as it's not fully defined in the fragments
// The `stream` property is added to update peers with their video stream
type PeerInfoWithStream = PeerInfo & {
  stream?: MediaStream;
};

// The original code used socket.id, so we need to type it
type SocketWithId = Socket & { id: string };

type UseMeetRoomOptions = {
  initialRoomId?: string;
  roomIsPublic?: boolean;
};

export function useMeetRoom(options: UseMeetRoomOptions = {}) {
  const { initialRoomId = "", roomIsPublic = false } = options;

  // --- State ---
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState(initialRoomId);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [peers, setPeers] = useState<PeerInfoWithStream[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [myScreenStream, setMyScreenStream] = useState<MediaStream | null>(
    null
  );
  const [isPublicRoom, setIsPublicRoom] = useState(roomIsPublic);

  // --- Refs ---
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<SocketWithId | null>(null);
  const peersRef = useRef<PeerInfoWithStream[]>([]);
  const initialRoomIdRef = useRef(initialRoomId);

  useEffect(() => {
    initialRoomIdRef.current = initialRoomId;
    if (initialRoomId && initialRoomId !== roomId) {
      setRoomId(initialRoomId);
    }
  }, [initialRoomId, roomId]);

  // --- Basic Helpers ---
  const clearError = useCallback(() => setErrorMessage(""), []);

  /**
   * This function updates the main `peers` state with a new stream.
   * This is necessary to trigger React to re-render the video component.
   */
  const updatePeerStream = useCallback(
    (peerId: string, stream: MediaStream) => {
      console.log("hit hit");
      setPeers((prevPeers) =>
        prevPeers.map((p) => (p.peerId === peerId ? { ...p, stream } : p))
      );
    },
    []
  );

  /**
   * Helper: remove duplicate PeerInfo objects by peerId, preserving first occurrence.
   */
  const dedupePeerInfos = useCallback((arr: PeerInfoWithStream[]) => {
    const map = new Map<string, PeerInfoWithStream>();
    arr.forEach((p) => {
      if (p && p.peerId && !map.has(p.peerId)) {
        map.set(p.peerId, p);
      }
    });
    return Array.from(map.values());
  }, []);

  /**
   * Clears all peer connections and state.
   */
  const clearPeers = useCallback(() => {
    peersRef.current.forEach(({ peer }) => {
      peer.destroy();
    });
    peersRef.current = [];
    setPeers([]);
  }, []);

  /**
   * Replaces the video track for all existing peers.
   * Used for starting/stopping screen sharing.
   */
  const replaceVideoTrackForPeers = useCallback(
    (track: MediaStreamTrack | null) => {
      if (!myStream) return;
      const oldTrack = myStream.getVideoTracks()[0];

      peersRef.current.forEach(({ peer }) => {
        if (peer.replaceTrack) {
          peer.replaceTrack(oldTrack, track ?? oldTrack, myStream);
        } else {
          console.warn("peer.replaceTrack is not available");
        }
      });
    },
    [myStream]
  );

  // --- WebRTC Peer Helpers ---

  /**
   * Creates a new peer connection (as the initiator).
   */
  const createPeer = useCallback(
    (receiverSocketId: string, mySocketId: string, stream: MediaStream) => {
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream,
      });

      peer.on("signal", (signal: SignalData) => {
        console.log("createPeer: sending signal", { to: receiverSocketId });
        socketRef.current?.emit("send-signal", {
          signal,
          receiverSocketId,
          callerId: mySocketId,
          username,
        });
      });

      peer.on("stream", (remoteStream: MediaStream) => {
        console.log("createPeer: received stream", { from: receiverSocketId });
        updatePeerStream(receiverSocketId, remoteStream);
      });

      peer.on("error", (err: unknown) => {
        console.error("createPeer: peer error", {
          peerId: receiverSocketId,
          err,
        });
      });

      peer.on("close", () => {
        console.log("createPeer: peer closed", { peerId: receiverSocketId });
      });

      return peer;
    },
    [updatePeerStream, username]
  );

  /**
   * Adds a peer connection (as the receiver).
   */
  const addPeer = useCallback(
    (incomingSignal: SignalData, callerId: string, stream: MediaStream) => {
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream,
      });

      peer.on("signal", (signal: SignalData) => {
        console.log("addPeer: returning signal", { toCaller: callerId });
        socketRef.current?.emit("return-signal", {
          signal,
          callerId,
        });
      });

      peer.on("stream", (remoteStream: MediaStream) => {
        console.log("addPeer: received stream from caller", { callerId });
        updatePeerStream(callerId, remoteStream);
      });

      peer.on("error", (err: unknown) => {
        console.error("addPeer: peer error", { peerId: callerId, err });
      });

      peer.on("close", () => {
        console.log("addPeer: peer closed", { peerId: callerId });
      });

      peer.signal(incomingSignal);

      return peer;
    },
    [updatePeerStream]
  );

  // --- Screen Share ---

  /**
   * Stops the screen share stream.
   */
  const stopScreenShare = useCallback(() => {
    myScreenStream?.getTracks().forEach((track) => track.stop());
    setMyScreenStream(null);
    setIsSharingScreen(false);

    // Revert to camera stream for all peers
    const oldVideoTrack = myStream?.getVideoTracks()[0] ?? null;
    replaceVideoTrackForPeers(oldVideoTrack);

    // Revert local video feed to camera
    if (myVideoRef.current && myStream) {
      myVideoRef.current.srcObject = myStream;
    }
  }, [myScreenStream, myStream, replaceVideoTrackForPeers]);

  const startScreenShare = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        const msg =
          "Screen sharing not available: your site is likely served over an insecure origin.";
        console.error(msg);
        setErrorMessage(msg);
        return;
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      setMyScreenStream(screenStream);
      setIsSharingScreen(true);

      const screenTrack = screenStream.getVideoTracks()[0];

      replaceVideoTrackForPeers(screenTrack ?? null);

      if (myVideoRef.current) {
        myVideoRef.current.srcObject = screenStream;
      }

      if (screenTrack) {
        screenTrack.onended = () => {
          stopScreenShare();
        };
      }
    } catch (error) {
      console.error("Error starting screen share:", error);
      stopScreenShare(); // Ensure state is reset if user cancels
    }
  }, [replaceVideoTrackForPeers, stopScreenShare]);

  const toggleScreenShare = useCallback(() => {
    if (isSharingScreen) {
      stopScreenShare();
    } else {
      void startScreenShare();
    }
  }, [isSharingScreen, startScreenShare, stopScreenShare]);

  // --- Room and Chat Handlers ---

  const handleJoinRoom = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      clearError();

      if (!username.trim() || !roomId.trim()) {
        setErrorMessage("Please enter a username and room name.");
        return;
      }

      if (!myStream) {
        setErrorMessage("Waiting for camera/mic permissions...");
        return;
      }

      setIsPublicRoom(!password.trim());
      setInRoom(true);
    },
    [clearError, myStream, password, roomId, username]
  );

  const handleLeaveRoom = useCallback(() => {
    setInRoom(false);

    if (isSharingScreen) {
      stopScreenShare();
    }

    if (isPublicRoom) {
      setRoomId(initialRoomIdRef.current ?? "");
    } else {
      setRoomId("");
    }
    // Keep username for convenience? Or clear it? Let's clear it.
    // setUsername("");
    setPassword("");
    setErrorMessage("");
    setChatMessages([]);
    setChatInput("");
    setShowChat(false);
    setIsPublicRoom(roomIsPublic);
  }, [isPublicRoom, isSharingScreen, roomIsPublic, stopScreenShare]);

  const sendChatMessage = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!chatInput.trim()) return;

      const message: ChatMessage = {
        username,
        message: chatInput,
        timestamp: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, { ...message, isMe: true }]);
      socketRef.current?.emit("send-chat", { roomId, message });
      setChatInput("");
    },
    [chatInput, roomId, username]
  );

  // --- Media Toggles ---

  const toggleMic = useCallback(() => {
    if (!myStream) return;
    const [audioTrack] = myStream.getAudioTracks();
    if (!audioTrack) return;
    audioTrack.enabled = !micOn;
    setMicOn((prev) => !prev);
  }, [micOn, myStream]);

  const toggleVideo = useCallback(() => {
    if (!myStream) return;
    const [videoTrack] = myStream.getVideoTracks();
    if (!videoTrack) return;
    videoTrack.enabled = !videoOn;
    setVideoOn((prev) => !prev);
  }, [myStream, videoOn]);

  // --- Effects ---

  /**
   * Get user media (camera/mic) on component mount.
   */
  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setMyStream(stream);
      } catch (err) {
        console.error("Failed to get media:", err);
        setErrorMessage(
          "Failed to access camera and microphone. Please check permissions."
        );
      }
    };
    void getMedia();

    // Cleanup stream on hook unmount
    return () => {
      myStream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once

  /**
   * Update the local video feed element when the stream changes
   * (e.g., on load, or when screen sharing starts/stops).
   */
  useEffect(() => {
    const videoElement = myVideoRef.current;
    if (!videoElement) return;

    const activeStream =
      isSharingScreen && myScreenStream ? myScreenStream : myStream;

    videoElement.srcObject = activeStream ?? null;

    if (activeStream) {
      const playPromise = videoElement.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch((err) => {
          console.warn("Local video play prevented", err);
        });
      }
    }
  }, [inRoom, isSharingScreen, myScreenStream, myStream]);

  /**
   * Main socket connection and event handling effect.
   * This runs when the user joins a room.
   */
  useEffect(() => {
    if (!inRoom || !myStream) return;

    const socket = io(NEST_SERVER_URL ?? undefined) as SocketWithId;
    socketRef.current = socket;

    socket.emit("join-room", { roomId, username, password });

    const handleAllUsers = ({ users }: { users: RoomUser[] }) => {
      console.log("Got all users:", users);
      const peersForState: PeerInfoWithStream[] = [];
      peersRef.current = [];

      users.forEach((user) => {
        const peer = createPeer(user.socketId, socket.id, myStream);
        const peerObj: PeerInfoWithStream = {
          peer,
          peerId: user.socketId,
          username: user.username,
        };

        // only push if not already present
        if (!peersRef.current.some((p) => p.peerId === peerObj.peerId)) {
          peersRef.current.push(peerObj);
        }
        peersForState.push(peerObj);
      });
      // ensure no duplicates before setting state
      const unique = dedupePeerInfos(peersForState);
      peersRef.current = dedupePeerInfos(peersRef.current);
      setPeers(unique);
      setUsersCount(users.length + 1);
    };

    const handleUserJoined = ({
      signal,
      callerId,
      username: callerUsername,
    }: {
      signal: SignalData;
      callerId: string;
      username: string;
    }) => {
      console.log("User joined:", callerId);
      const peer = addPeer(signal, callerId, myStream);
      const peerObj: PeerInfoWithStream = {
        peer,
        peerId: callerId,
        username: callerUsername,
      };
      // Avoid adding duplicate peers
      if (peersRef.current.some((p) => p.peerId === callerId)) {
        console.log("user-joined: duplicate peer ignored", callerId);
        return;
      }

      peersRef.current.push(peerObj);
      console.log("hit");
      setPeers((prev) => dedupePeerInfos([...prev, peerObj]));
      setUsersCount((c) => c + 1);
    };

    const handleSignalReceived = ({
      signal,
      callerId,
    }: {
      signal: SignalData;
      callerId: string;
    }) => {
      console.log("handleSignalReceived: applying signal", { callerId });
      const peerObj = peersRef.current.find((p) => p.peerId === callerId);
      peerObj?.peer.signal(signal);
    };

    const handleUserLeft = ({ socketId }: { socketId: string }) => {
      console.log("User left:", socketId);
      const peerObj = peersRef.current.find((p) => p.peerId === socketId);
      peerObj?.peer.destroy();

      const remainingPeers = peersRef.current.filter(
        (p) => p.peerId !== socketId
      );
      peersRef.current = remainingPeers;
      setPeers(remainingPeers);
      setUsersCount((c) => Math.max(0, c - 1)); // c-1
    };

    const handleChatMessage = (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    };

    const handleJoinError = ({ message }: { message: string }) => {
      console.error("Join error:", message);
      setErrorMessage(message);
      setInRoom(false);
      socket.disconnect();
      setUsersCount(0);
    };

    socket.on("all-users", handleAllUsers);
    socket.on("user-joined", handleUserJoined);
    socket.on("signal-received", handleSignalReceived);
    socket.on("user-left", handleUserLeft);
    socket.on("chat-message", handleChatMessage);
    socket.on("join-error", handleJoinError);

    // Cleanup on leave
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      clearPeers();
      setUsersCount(0);
    };
  }, [
    addPeer,
    clearPeers,
    createPeer,
    dedupePeerInfos,
    inRoom,
    myStream,
    password,
    roomId,
    username,
  ]);

  // --- Returned values ---
  return {
    inRoom,
    roomId,
    username,
    password,
    errorMessage,
    peers,
    usersCount,
    chatMessages,
    chatInput,
    showChat,
    micOn,
    videoOn,
    isSharingScreen,
    myVideoRef,
    setRoomId,
    setUsername,
    setPassword,
    setChatInput,
    setShowChat,
    handleJoinRoom,
    handleLeaveRoom,
    sendChatMessage,
    toggleMic,
    toggleVideo,
    toggleScreenShare,
    clearError,
    isPublicRoom,
  };
}
