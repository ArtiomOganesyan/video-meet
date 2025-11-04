"use client";

import { useMemo } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";

import MeetingRoom from "../meet/components/MeetingRoom";
import { useMeetRoom } from "../meet/hooks/useMeetRoom";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function PublicRoomPage() {
  const params = useParams();
  const paramRoom = params?.roomId;
  const rawRoomId = Array.isArray(paramRoom)
    ? paramRoom[0] ?? ""
    : paramRoom ?? "";
  const decodedRoomId = useMemo(() => {
    try {
      return decodeURIComponent(rawRoomId);
    } catch {
      return rawRoomId;
    }
  }, [rawRoomId]);

  const {
    inRoom,
    roomId,
    username,
    errorMessage,
    peers,
    chatMessages,
    chatInput,
    showChat,
    micOn,
    videoOn,
    isSharingScreen,
    usersCount,
    myVideoRef,
    setUsername,
    setChatInput,
    setShowChat,
    handleJoinRoom,
    handleLeaveRoom,
    sendChatMessage,
    toggleMic,
    toggleVideo,
    toggleScreenShare,
    clearError,
  } = useMeetRoom({
    initialRoomId: decodedRoomId,
    roomIsPublic: true,
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "24px",
          height: "75px",
          alignItems: "center",
          padding: "4px",
        }}
      >
        <img height={65} src="./image.png" alt="title" />
        <Typography variant="h3">
          <Link href="/">UNORA</Link>
        </Typography>
      </div>
      {!inRoom ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            width: "100%",
            maxWidth: 420,
            margin: "0 auto",
            padding: 2,
          }}
        >
          <Typography variant="h4" component="h1">
            Join Room "{roomId}"
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This room does not require a password. Share the URL to invite
            others directly.
          </Typography>
          {errorMessage ? (
            <Typography color="error" variant="body2">
              {errorMessage}
            </Typography>
          ) : null}
          <Box
            component="form"
            onSubmit={handleJoinRoom}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              color="secondary"
              id="username"
              label="Your Name"
              variant="outlined"
              value={username}
              onFocus={clearError}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your name"
              fullWidth
            />
            <Button color="secondary" variant="contained" type="submit">
              Join Room
            </Button>
          </Box>
        </Box>
      ) : (
        <MeetingRoom
          roomId={roomId}
          username={username}
          peers={peers}
          usersCount={usersCount}
          myVideoRef={myVideoRef}
          micOn={micOn}
          videoOn={videoOn}
          isSharingScreen={isSharingScreen}
          showChat={showChat}
          chatMessages={chatMessages}
          chatInput={chatInput}
          onToggleMic={toggleMic}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onLeave={handleLeaveRoom}
          onToggleChat={() => setShowChat((prev) => !prev)}
          onCloseChat={() => setShowChat(false)}
          onChatInputChange={setChatInput}
          onSubmitChat={sendChatMessage}
          canShareRoom
        />
      )}
    </div>
  );
}
