import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { GameService } from './game.service';
import { GameEngineService } from './game-engine.service';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { ActorSpawnDto, ActorUpdateDto } from './dto/actor.dto';

interface ConnectedClient {
  userId: string;
  projectId: string;
  matchId?: string;
  socketId: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private connectedClients: Map<string, ConnectedClient> = new Map();
  private server: Server;

  constructor(
    private gameService: GameService,
    private matchmakingService: MatchmakingService,
    private gameEngine: GameEngineService,
  ) {}

  // --------------------------
  // Connection Handlers
  // --------------------------
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const { projectId, accessToken } = client.handshake.auth;
      const { userId } = await this.gameService.validateConnection(
        projectId,
        accessToken,
      );

      this.connectedClients.set(client.id, {
        userId,
        projectId,
        socketId: client.id,
      });
      client.emit('connected', { userId, projectId });
      console.log(`✅ Client connected: ${userId} to project ${projectId}`);
    } catch (error) {
      client.emit('error.unauthorized', { message: 'Invalid token' });
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData?.matchId) {
      // Graceful cleanup
      // Persist if last player, remove from match
      // this.matchesService.removePlayer(clientData.matchId, clientData.userId);
      // const match = this.matchStates.get(clientData.matchId);
      // if (match && Object.keys(match.actors).length === 0) {
      //   this.gameEngine.persistMatchState(clientData.matchId);
      // }
    }
    this.connectedClients.delete(client.id);
    console.log(`❌ Client disconnected: ${client.id}`);
  }

  // --------------------------
  // Matchmaking
  // --------------------------
  @SubscribeMessage('matchmaking.join')
  async handleJoinQueue(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData) return;

    try {
      const queueId = await this.gameService.handleJoinQueue(client, {
        projectId: data.projectId,
        userId: clientData.userId,
        socketId: client.id,
      });
      client.emit('matchmaking.joined', { queueId });
    } catch (error) {
      client.emit('error.match_not_found', { message: error.message });
    }
  }

  @SubscribeMessage('matchmaking.leave')
  async handleLeaveQueue(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData) return;

    await this.matchmakingService.leaveQueue({
      projectId: data.projectId,
      userId: clientData.userId,
      socketId: client.id,
    });
    client.emit('matchmaking.left');
  }

  @SubscribeMessage('match.found')
  async handleMatchFound(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.matchId = data.matchId;
      client.join(`match_${data.matchId}`);
      console.log(
        `🎮 Player ${clientData.userId} joined match ${data.matchId}`,
      );
    }
  }

  @SubscribeMessage('match.end')
  async handleMatchEnd(@ConnectedSocket() client: Socket) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData?.matchId) return;

    await this.gameEngine.persistMatchState(clientData.matchId);
    this.server.to(`match_${clientData.matchId}`).emit('match.ended', {
      matchId: clientData.matchId,
    });
    await this.gameEngine.cleanupMatch(clientData.matchId);
  }

  async notifyMatchFound(matchId: string, playerIds: string[]) {
    playerIds.forEach((socketId) => {
      this.server.to(socketId).emit('match.found', { matchId });
      const client = this.connectedClients.get(socketId);
      if (client) {
        client.matchId = matchId;
        this.server.socketsJoin(`match_${matchId}`);
      }
    });
  }

  // --------------------------
  // Actor Management
  // --------------------------
  @SubscribeMessage('actor.spawn')
  async handleSpawnActor(
    @MessageBody() data: ActorSpawnDto,
    @ConnectedSocket() client: Socket,
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData?.matchId) {
      client.emit('error.match_not_found', { message: 'No active match' });
      return;
    }

    try {
      await this.gameService.handleSpawnActor(
        clientData.matchId,
        data.id,
        clientData.userId,
        data.state,
      );
      this.server.to(`match_${clientData.matchId}`).emit('actor.spawned', data);
    } catch (error) {
      client.emit('error.invalid_payload', { message: error.message });
    }
  }

  @SubscribeMessage('actor.update')
  async handleUpdateActor(
    @MessageBody() data: ActorUpdateDto,
    @ConnectedSocket() client: Socket,
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData?.matchId) {
      client.emit('error.match_not_found');
      return;
    }

    try {
      await this.gameService.handleUpdateActor(
        clientData.matchId,
        data.id,
        clientData.userId,
        data.state,
      );
      this.server.to(`match_${clientData.matchId}`).emit('actor.updated', data);
    } catch (error) {
      client.emit('error.invalid_payload', { message: error.message });
    }
  }

  @SubscribeMessage('actor.remove')
  async handleRemoveActor(
    @MessageBody() data: { id: string },
    @ConnectedSocket() client: Socket,
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData?.matchId) return;

    this.server.to(`match_${clientData.matchId}`).emit('actor.removed', data);
  }

  // --------------------------
  // Game State
  // --------------------------
  @SubscribeMessage('state.sync')
  async handleStateSync(@ConnectedSocket() client: Socket) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData?.matchId) {
      client.emit('error.match_not_found');
      return;
    }

    const state = await this.gameEngine.getFullState(clientData.matchId);
    client.emit('state.synced', state);
  }
}
