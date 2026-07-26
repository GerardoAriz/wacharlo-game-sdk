import type { IMatchDataAggregator, MatchStateSnapshot, PlayerState } from '../types/index';
/**
 * MatchDataAggregator
 *
 * Concrete implementation of `IMatchDataAggregator`.
 * Neutral, game-agnostic state container that tracks match participants,
 * elimination sequence, scores, timestamps, and duration.
 *
 * Contains zero game-mode victory logic or rule evaluation.
 */
export declare class MatchDataAggregator implements IMatchDataAggregator {
    private readonly roomId;
    private readonly players;
    private readonly eliminationOrder;
    private startTime;
    constructor(roomId: string, playerIds?: string[]);
    getRoomId(): string;
    startMatch(playerIds: string[], startTime?: number): void;
    processPlayerDied(playerId: string, score?: number, timestamp?: number): boolean;
    updatePlayerScore(playerId: string, score: number): void;
    isPlayerAlive(playerId: string): boolean;
    getPlayerState(playerId: string): Readonly<PlayerState> | undefined;
    getSnapshot(): Readonly<MatchStateSnapshot>;
}
//# sourceMappingURL=MatchDataAggregator.d.ts.map