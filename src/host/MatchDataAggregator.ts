import type {
  IMatchDataAggregator,
  MatchStateSnapshot,
  PlayerState,
} from '../types/index';

/**
 * MatchDataAggregator
 *
 * Concrete implementation of `IMatchDataAggregator`.
 * Neutral, game-agnostic state container that tracks match participants,
 * elimination sequence, scores, timestamps, and duration.
 *
 * Contains zero game-mode victory logic or rule evaluation.
 */
export class MatchDataAggregator implements IMatchDataAggregator {
  private readonly roomId: string;
  private readonly players: Map<string, PlayerState> = new Map();
  private readonly eliminationOrder: string[] = [];
  private startTime: number = 0;

  constructor(roomId: string, playerIds: string[] = []) {
    if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
      throw new TypeError('MatchDataAggregator: roomId is required');
    }
    this.roomId = roomId.trim();
    if (playerIds.length > 0) {
      this.startMatch(playerIds);
    }
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public startMatch(playerIds: string[], startTime?: number): void {
    this.players.clear();
    this.eliminationOrder.length = 0;
    this.startTime = startTime ?? Date.now();

    for (const id of playerIds) {
      if (!id || typeof id !== 'string') continue;
      const cleanId = id.trim();
      if (!cleanId) continue;
      this.players.set(cleanId, {
        playerId: cleanId,
        isAlive: true,
        score: 0,
      });
    }
  }

  public processPlayerDied(playerId: string, score?: number, timestamp?: number): boolean {
    if (!playerId || typeof playerId !== 'string') return false;
    const cleanId = playerId.trim();
    const state = this.players.get(cleanId);

    // Exact-once safeguard: ignore if player is unknown or already dead
    if (!state || !state.isAlive) {
      return false;
    }

    state.isAlive = false;
    if (typeof score === 'number' && !isNaN(score)) {
      state.score = score;
    }
    state.deathOrder = this.eliminationOrder.length + 1;
    state.diedAt = timestamp ?? Date.now();

    this.eliminationOrder.push(cleanId);
    return true;
  }

  public updatePlayerScore(playerId: string, score: number): void {
    if (!playerId || typeof playerId !== 'string' || isNaN(score)) return;
    const state = this.players.get(playerId.trim());
    if (state) {
      state.score = score;
    }
  }

  public isPlayerAlive(playerId: string): boolean {
    if (!playerId || typeof playerId !== 'string') return false;
    return this.players.get(playerId.trim())?.isAlive ?? false;
  }

  public getPlayerState(playerId: string): Readonly<PlayerState> | undefined {
    if (!playerId || typeof playerId !== 'string') return undefined;
    const state = this.players.get(playerId.trim());
    if (!state) return undefined;
    return Object.freeze({ ...state });
  }

  public getSnapshot(): Readonly<MatchStateSnapshot> {
    const playersList: PlayerState[] = Array.from(this.players.values()).map(p =>
      Object.freeze({ ...p })
    );

    const finalScores: Record<string, number> = {};
    let aliveCount = 0;
    let eliminatedCount = 0;

    for (const p of playersList) {
      finalScores[p.playerId] = p.score;
      if (p.isAlive) {
        aliveCount++;
      } else {
        eliminatedCount++;
      }
    }

    const now = Date.now();
    const durationMs = this.startTime > 0 ? Math.max(0, now - this.startTime) : 0;

    const snapshot: MatchStateSnapshot = {
      roomId: this.roomId,
      players: Object.freeze(playersList),
      aliveCount,
      eliminatedCount,
      eliminationOrder: Object.freeze([...this.eliminationOrder]),
      finalScores: Object.freeze(finalScores),
      startTime: this.startTime,
      durationMs,
    };

    return Object.freeze(snapshot);
  }
}
