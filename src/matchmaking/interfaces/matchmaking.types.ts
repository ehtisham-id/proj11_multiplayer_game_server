export interface MatchmakingQueue {
  projectId: string;
  matchId?: string;
  players: Array<{
    userId: string;
    socketId: string;
    joinedAt: number;
  }>;
  maxPlayers: number;
  createdAt: number;
}

export interface MatchmakingPlayer {
  projectId: string;
  userId: string;
  socketId: string;
}
