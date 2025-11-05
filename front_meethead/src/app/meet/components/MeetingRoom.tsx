"use client";

import {
  useState,
  useEffect,
  useCallback,
  type FormEvent,
  type RefObject,
  useRef,
} from "react";

import PeerVideo from "./PeerVideo";
import type { ChatMessage, PeerInfo } from "../types";
import {
  Button,
  Typography,
  Box,
  Drawer,
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import styles from "./MeetingRoom.module.css";
import ForumIcon from "@mui/icons-material/Forum";
import ShareIcon from "@mui/icons-material/Share";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import LogoutIcon from "@mui/icons-material/Logout";

type MeetingRoomProps = {
  roomId: string;
  username: string;
  peers: PeerInfo[];
  myVideoRef: RefObject<HTMLVideoElement | null>;
  usersCount?: number;
  micOn: boolean;
  videoOn: boolean;
  isSharingScreen: boolean;
  showChat: boolean;
  chatMessages: ChatMessage[];
  chatInput: string;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  onToggleChat: () => void;
  onCloseChat: () => void;
  onChatInputChange: (value: string) => void;
  onSubmitChat: (event: FormEvent<HTMLFormElement>) => void;
  canShareRoom?: boolean;
};

export default function MeetingRoom({
  roomId,
  username,
  peers,
  usersCount = 0,
  myVideoRef,
  micOn,
  videoOn,
  isSharingScreen,
  showChat,
  chatMessages,
  chatInput,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
  onToggleChat,
  onCloseChat,
  onChatInputChange,
  onSubmitChat,
  canShareRoom = false,
}: MeetingRoomProps) {
  const formatUsersCount = (n: number) =>
    n === 1 ? `${n} участник` : `${n} участников`;
  const [open, setOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<{
    message: string;
    isError?: boolean;
  } | null>(null);
  const shareFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // const toggleDrawer = (newOpen: boolean) => () => {
  //   setOpen(newOpen);
  //   if (!newOpen) {
  //     // notify parent to keep showChat in sync when drawer is closed via internal controls
  //     onCloseChat();
  //   }
  // };

  // Keep local open state in sync with parent prop `showChat`.
  // Parent toggles `showChat` when the Chat button is clicked.
  // When `showChat` changes, reflect that in this Drawer.
  useEffect(() => {
    setOpen(Boolean(showChat));
  }, [showChat]);

  useEffect(() => {
    return () => {
      if (shareFeedbackTimeoutRef.current) {
        clearTimeout(shareFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleShareSuccess = useCallback((message: string) => {
    if (shareFeedbackTimeoutRef.current) {
      clearTimeout(shareFeedbackTimeoutRef.current);
    }
    setShareFeedback({ message, isError: false });
    shareFeedbackTimeoutRef.current = setTimeout(() => {
      setShareFeedback(null);
    }, 3500);
  }, []);

  const handleShareError = useCallback((message: string) => {
    if (shareFeedbackTimeoutRef.current) {
      clearTimeout(shareFeedbackTimeoutRef.current);
    }
    setShareFeedback({ message, isError: true });
    shareFeedbackTimeoutRef.current = setTimeout(() => {
      setShareFeedback(null);
    }, 5000);
  }, []);

  const handleShareRoom = useCallback(async () => {
    if (!canShareRoom) return;

    const encodedRoomId = encodeURIComponent(roomId);
    const shareUrl = `${window.location.origin}/${encodedRoomId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Присоединиться к комнате ${roomId}`,
          text: `Присоединиться к ${username} в комнате ${roomId}`,
          url: shareUrl,
        });
        handleShareSuccess("Диалог шаринга открыт");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        handleShareSuccess("Ссылка на комнату скопирована в буфер обмена");
        return;
      }

      // Fallback if clipboard API is unavailable
      window.prompt("Скопируйте URL комнаты", shareUrl);
      handleShareSuccess("Ссылка на комнату готова к отправке");
    } catch (error) {
      console.error("Failed to share room URL", error);
      handleShareError("Не удалось поделиться ссылкой на комнату");
    }
  }, [canShareRoom, handleShareError, handleShareSuccess, roomId, username]);

  const totalParticipants = peers.length + 1;
  const isSolo = totalParticipants === 1;
  const videoGridClassNames = [
    styles.videoGrid,
    isSolo
      ? styles.videoGridSolo
      : styles[`videoGridCols${Math.min(totalParticipants, 4)}`],
  ]
    .filter(Boolean)
    .join(" ");
  const myVideoTileClass = [
    styles.videoTile,
    isSolo ? styles.soloTile : styles.participantTile,
  ]
    .filter(Boolean)
    .join(" ");
  const participantTileClass = [styles.videoTile, styles.participantTile]
    .filter(Boolean)
    .join(" ");

  const controlButtonClass = (active?: boolean) =>
    [styles.controlButton, active ? styles.controlButtonActive : ""]
      .filter(Boolean)
      .join(" ");

  return (
    <div className={styles.meetingRoom}>
      <main className={styles.mainContent}>
        <Box
          component="header"
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Комната: {roomId}
          </Typography>
          <Typography variant="h6" sx={{ color: "var(--text-muted)" }}>
            {formatUsersCount(usersCount)}
          </Typography>
          <Box
            sx={{
              ml: "auto",
              display: "flex",
              gap: 1,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {canShareRoom ? (
              <Button
                variant="outlined"
                onClick={handleShareRoom}
                color="secondary"
              >
                <Typography sx={{ mr: 1.25, fontWeight: 600 }}>
                  Поделиться
                </Typography>
                <ShareIcon fontSize="small" />
              </Button>
            ) : null}
            <Button
              variant="outlined"
              onClick={onToggleChat}
              color="secondary"
              sx={{
                ...(showChat
                  ? {
                      backgroundColor: "var(--primary)",
                      borderColor: "var(--primary)",
                    }
                  : {}),
              }}
            >
              <Typography sx={{ mr: 1.25, fontWeight: 600 }}>Чат</Typography>
              <ForumIcon fontSize="small" />
            </Button>
          </Box>
        </Box>
        {canShareRoom && shareFeedback ? (
          <Typography variant="caption" sx={{ mt: 1 }}>
            {shareFeedback.message}
          </Typography>
        ) : null}
        <section className={styles.videoSection}>
          <div className={videoGridClassNames}>
            <div className={myVideoTileClass}>
              <video
                ref={myVideoRef}
                autoPlay
                playsInline
                muted
                className={styles.video}
              />
              <div className={styles.videoLabel}>{username} (Вы)</div>
            </div>
            {peers.map((peerObj) => (
              <PeerVideo
                key={peerObj.peerId}
                peer={peerObj.peer}
                username={peerObj.username}
                stream={peerObj.stream}
                className={participantTileClass}
                videoClassName={styles.video}
                labelClassName={styles.videoLabel}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Persistent bottom controls */}
      <div
        className={styles.controlsBar}
        role="group"
        aria-label="Meeting controls"
      >
        <Button
          color="secondary"
          onClick={onToggleMic}
          className={controlButtonClass(micOn)}
          startIcon={micOn ? <MicIcon /> : <MicOffIcon />}
          aria-label={micOn ? "Выключить микрофон" : "Включить микрофон"}
        >
          {micOn ? "Микрофон" : "Микрофон выкл"}
        </Button>

        <Button
          color="secondary"
          onClick={onToggleVideo}
          className={controlButtonClass(videoOn)}
          startIcon={videoOn ? <VideocamIcon /> : <VideocamOffIcon />}
          aria-label={videoOn ? "Выключить камеру" : "Включить камеру"}
        >
          {videoOn ? "Видео" : "Видео выкл"}
        </Button>

        <Button
          color="secondary"
          onClick={onToggleScreenShare}
          className={controlButtonClass(isSharingScreen)}
          startIcon={
            isSharingScreen ? <StopScreenShareIcon /> : <ScreenShareIcon />
          }
          aria-label={
            isSharingScreen
              ? "Остановить демонстрацию экрана"
              : "Демонстрация экрана"
          }
        >
          {isSharingScreen ? "Остановить демонстрацию" : "Демонстрация"}
        </Button>

        <Button
          color="secondary"
          onClick={onLeave}
          className={[styles.controlButton, styles.leaveButton].join(" ")}
          startIcon={<LogoutIcon />}
          aria-label="Войти из встречи"
        >
          Выйти
        </Button>
      </div>

      {/* Drawer for Chat - opens from the right. Backdrop (mask) clicks and escape will trigger onClose. */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => {
          setOpen(false);
          onCloseChat();
        }}
        // PaperProps={{ sx: drawerPaperStyles }}
      >
        <Box
          sx={{
            width: 360,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            backgroundColor: "transparent",
          }}
          role="presentation"
        >
          <Box
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Чат комнаты
            </Typography>
            <Button
              color="secondary"
              onClick={() => {
                setOpen(false);
                onCloseChat();
              }}
            >
              Закрыть
            </Button>
          </Box>
          <Divider sx={{ borderColor: "var(--border)" }} />

          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            <List disablePadding>
              {chatMessages.map((msg, index) => (
                <ListItem
                  key={index}
                  alignItems="flex-start"
                  sx={{ px: 0, py: 1.25 }}
                >
                  <ListItemText
                    primary={msg.username}
                    secondary={msg.message}
                    primaryTypographyProps={{
                      sx: { fontWeight: 600, color: "var(--text)" },
                    }}
                    secondaryTypographyProps={{
                      sx: { color: "var(--text-muted)" },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          <Divider sx={{ borderColor: "var(--border)" }} />

          <Box
            component="form"
            onSubmit={onSubmitChat}
            sx={{
              p: 2,
              display: "flex",
              gap: 1,
              backgroundColor: "var(--surface-alt)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <TextField
              color="secondary"
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              placeholder="Введите сообщение..."
              multiline
              maxRows={4}
              fullWidth
              size="small"
            />
            <Button type="submit" variant="contained" color="secondary">
              Отправить
            </Button>
          </Box>
        </Box>
      </Drawer>
    </div>
  );
}
