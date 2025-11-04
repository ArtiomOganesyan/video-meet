/* * This file would be `src/meet.gateway.ts` in your NestJS project.
 * You'll need to:
 * 1. `npm install @nestjs/websockets @nestjs/platform-socket.io socket.io`
 * 2. Add `MeetGateway` to the `providers` array in your `app.module.ts`.
 */

import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// --- Types ---
interface RoomData {
  password?: string;
  users: Map<string, { username: string }>; // socketId -> { username }
}

interface JoinPayload {
  roomId: string;
  username: string;
  password?: string;
}

interface SignalPayload {
  signal: any;
  receiverSocketId: string;
  callerId: string;
  username: string;
}

interface ReturnSignalPayload {
  signal: any;
  callerId: string;
}

interface ChatPayload {
  roomId: string;
  message: {
    username: string;
    message: string;
    timestamp: string;
  };
}

// --- Gateway ---

// Configure the gateway.
// We enable CORS to allow your Next.js frontend (on a different port) to connect.
@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict this to your Next.js app's URL
  },
})
export class MeetGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  // In-memory store for rooms.
  // In a real app, you might use Redis for this.
  private rooms = new Map<string, RoomData>();

  afterInit(server: Server) {
    console.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  // --- Handle User Disconnection ---
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Find which room the user was in and notify others
    this.rooms.forEach((room, roomId) => {
      if (room.users.has(client.id)) {
        room.users.delete(client.id);
        // If room is empty, delete it
        if (room.users.size === 0) {
          this.rooms.delete(roomId);
        } else {
          // Notify remaining users
          this.server.to(roomId).emit('user-left', { socketId: client.id });
        }
      }
    });
  }

  // --- Handle "join-room" Event ---
  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, payload: JoinPayload): void {
    const { roomId, username, password } = payload;

    // --- Room & Password Logic ---
    let room = this.rooms.get(roomId);

    if (!room) {
      // New room. Create it.
      room = {
        users: new Map(),
        ...(password && { password: password }), // Add password if provided
      };
      this.rooms.set(roomId, room);
    } else {
      // Existing room. Check password.
      if (room.password && room.password !== password) {
        client.emit('join-error', { message: 'Incorrect room password' });
        return;
      }
      if (!room.password && password) {
        client.emit('join-error', {
          message: 'This room is not password-protected',
        });
        return;
      }
    }

    // --- Join Succeeded ---

    // 1. Get list of other users already in the room
    const otherUsers: { socketId: string; username: string }[] = [];
    room.users.forEach((userData, socketId) => {
      otherUsers.push({ socketId, ...userData });
    });

    // 2. Add new user to the room
    room.users.set(client.id, { username });
    client.join(roomId);

    // 3. Send the list of existing users *only to the new user*
    client.emit('all-users', { users: otherUsers });
  }

  // --- Handle WebRTC Signaling ---

  /**
   * Fired by a new user to send their "offer" to existing users.
   */
  @SubscribeMessage('send-signal')
  handleSendSignal(client: Socket, payload: SignalPayload): void {
    const { signal, receiverSocketId, callerId, username } = payload;

    // Forward the signal (offer) to the specific user
    this.server.to(receiverSocketId).emit('user-joined', {
      signal,
      callerId,
      username,
    });
  }

  /**
   * Fired by an existing user to "return" their "answer" to the new user.
   */
  @SubscribeMessage('return-signal')
  handleReturnSignal(client: Socket, payload: ReturnSignalPayload): void {
    const { signal, callerId } = payload;

    // Forward the signal (answer) back to the original caller
    this.server.to(callerId).emit('signal-received', {
      signal,
      callerId: client.id, // The ID of the user who is returning the signal
    });
  }

  // --- Handle Chat ---
  @SubscribeMessage('send-chat')
  handleSendChat(client: Socket, payload: ChatPayload): void {
    const { roomId, message } = payload;
    // Broadcast the message to everyone in the room *except* the sender
    // The sender already added it to their own UI
    client.to(roomId).emit('chat-message', message);
  }
}
