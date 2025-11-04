"use client";

import type { FormEvent, ChangeEvent } from "react";
import { Button, TextField, Typography, Box } from "@mui/material";
import styles from "./JoinRoomForm.module.css";

type JoinRoomFormProps = {
  username: string;
  roomId: string;
  password: string;
  errorMessage: string;
  onUsernameChange: (value: string) => void;
  onRoomIdChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldFocus: () => void;
};

export default function JoinRoomForm({
  username,
  roomId,
  password,
  errorMessage,
  onUsernameChange,
  onRoomIdChange,
  onPasswordChange,
  onSubmit,
  onFieldFocus,
}: JoinRoomFormProps) {
  const handleUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUsernameChange(event.target.value);
  };

  const handleRoomChange = (event: ChangeEvent<HTMLInputElement>) => {
    onRoomIdChange(event.target.value);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    onPasswordChange(event.target.value);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.hero}>
          <Typography variant="h3" className={styles.brand}>
            UNORA
          </Typography>
          <Typography className={styles.tagline}>
            Always on. Always connected.
          </Typography>
          <Typography className={styles.description}>
            Drop into a room with your crew in seconds. Share a link, lock it
            down with a password, and focus on the conversation — not the setup.
          </Typography>
        </div>

        <Box
          component="section"
          className={styles.formArea}
          aria-labelledby="join-room-heading"
        >
          <Typography
            id="join-room-heading"
            variant="h4"
            className={styles.formTitle}
          >
            Join a Room
          </Typography>
          {errorMessage ? (
            <div className={styles.error}>{errorMessage}</div>
          ) : null}

          <form onSubmit={onSubmit} className={styles.form}>
            <TextField
              id="username"
              color="secondary"
              label="Your Name"
              variant="outlined"
              value={username}
              onChange={handleUsernameChange}
              onFocus={onFieldFocus}
              placeholder="Enter your name"
              fullWidth
            />

            <TextField
              id="room-name"
              color="secondary"
              label="Room Name"
              variant="outlined"
              value={roomId}
              onChange={handleRoomChange}
              onFocus={onFieldFocus}
              placeholder="Enter room name"
              fullWidth
            />

            <TextField
              id="password"
              color="secondary"
              label="Room Password (optional)"
              variant="outlined"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              onFocus={onFieldFocus}
              placeholder="Leave blank for public room"
            />

            <Button color="secondary" variant="contained" type="submit">
              Join Room
            </Button>
          </form>
        </Box>
      </div>
    </div>
  );
}
