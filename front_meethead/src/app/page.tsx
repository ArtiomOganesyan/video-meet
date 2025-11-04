"use client";

import { Typography } from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import JoinRoomForm from "./meet/components/JoinRoomForm";
import MeetingRoom from "./meet/components/MeetingRoom";
import { useMeetRoom } from "./meet/hooks/useMeetRoom";
import styles from "./page.module.css";

export default function MeetAppPage() {
  const {
    inRoom,
    roomId,
    username,
    password,
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
  } = useMeetRoom();

  const contentClassName = [
    styles.content,
    inRoom ? styles.contentInRoom : styles.contentLanding,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "24px",
          height: "75px",
          alignItems: "center",
          padding: "4px",
        }}
      >
        <Image src="/image.png" alt="title" width={65} height={65} />
        <Typography variant="h3">
          <Link href="/">UNORA</Link>
        </Typography>
      </div>
      <div className={contentClassName}>
        {!inRoom ? (
          <JoinRoomForm
            username={username}
            roomId={roomId}
            password={password}
            errorMessage={errorMessage}
            onUsernameChange={setUsername}
            onRoomIdChange={setRoomId}
            onPasswordChange={setPassword}
            onSubmit={handleJoinRoom}
            onFieldFocus={() => {
              clearError();
            }}
          />
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
            canShareRoom={isPublicRoom}
          />
        )}
      </div>
    </div>
  );
}
