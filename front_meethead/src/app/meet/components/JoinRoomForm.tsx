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
            Присоединяйтесь к комнате за секунды. Поделитесь ссылкой, защитите
            паролем и сосредоточьтесь на разговоре — а не на настройке.
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
            Войти в комнату
          </Typography>
          {errorMessage ? (
            <div className={styles.error}>{errorMessage}</div>
          ) : null}

          <form onSubmit={onSubmit} className={styles.form}>
            <TextField
              id="username"
              color="secondary"
              label="Ваше имя"
              variant="outlined"
              value={username}
              onChange={handleUsernameChange}
              onFocus={onFieldFocus}
              placeholder="Введите ваше имя"
              fullWidth
            />

            <TextField
              id="room-name"
              color="secondary"
              label="Название комнаты"
              variant="outlined"
              value={roomId}
              onChange={handleRoomChange}
              onFocus={onFieldFocus}
              placeholder="Введите название комнаты"
              fullWidth
            />

            <TextField
              id="password"
              color="secondary"
              label="Пароль комнаты (необязательно)"
              variant="outlined"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              onFocus={onFieldFocus}
              placeholder="Оставьте пустым для публичной комнаты"
            />

            <Button color="secondary" variant="contained" type="submit">
              Присоединиться
            </Button>
          </form>
        </Box>
      </div>
    </div>
  );
}
