import type { Instance as PeerInstance } from "simple-peer";

export interface PeerInfo {
  peer: PeerInstance;
  peerId: string;
  username: string;
  stream?: MediaStream;
}

export interface ChatMessage {
  username: string;
  message: string;
  timestamp: string;
  isMe?: boolean;
}

export interface RoomUser {
  socketId: string;
  username: string;
}
