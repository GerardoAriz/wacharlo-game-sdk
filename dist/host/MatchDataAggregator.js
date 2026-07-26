/**
 * MatchDataAggregator
 *
 * Concrete implementation of `IMatchDataAggregator`.
 * Neutral, game-agnostic state container that tracks match participants,
 * elimination sequence, scores, timestamps, and duration.
 *
 * Contains zero game-mode victory logic or rule evaluation.
 */
export class MatchDataAggregator {
    roomId;
    players = new Map();
    eliminationOrder = [];
    startTime = 0;
    constructor(roomId, playerIds = []) {
        if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
            throw new TypeError('MatchDataAggregator: roomId is required');
        }
        this.roomId = roomId.trim();
        if (playerIds.length > 0) {
            this.startMatch(playerIds);
        }
    }
    getRoomId() {
        return this.roomId;
    }
    startMatch(playerIds, startTime) {
        this.players.clear();
        this.eliminationOrder.length = 0;
        this.startTime = startTime ?? Date.now();
        for (const id of playerIds) {
            if (!id || typeof id !== 'string')
                continue;
            const cleanId = id.trim();
            if (!cleanId)
                continue;
            this.players.set(cleanId, {
                playerId: cleanId,
                isAlive: true,
                score: 0,
            });
        }
    }
    processPlayerDied(playerId, score, timestamp) {
        if (!playerId || typeof playerId !== 'string')
            return false;
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
    updatePlayerScore(playerId, score) {
        if (!playerId || typeof playerId !== 'string' || isNaN(score))
            return;
        const state = this.players.get(playerId.trim());
        if (state) {
            state.score = score;
        }
    }
    isPlayerAlive(playerId) {
        if (!playerId || typeof playerId !== 'string')
            return false;
        return this.players.get(playerId.trim())?.isAlive ?? false;
    }
    getPlayerState(playerId) {
        if (!playerId || typeof playerId !== 'string')
            return undefined;
        const state = this.players.get(playerId.trim());
        if (!state)
            return undefined;
        return Object.freeze({ ...state });
    }
    getSnapshot() {
        const playersList = Array.from(this.players.values()).map(p => Object.freeze({ ...p }));
        const finalScores = {};
        let aliveCount = 0;
        let eliminatedCount = 0;
        for (const p of playersList) {
            finalScores[p.playerId] = p.score;
            if (p.isAlive) {
                aliveCount++;
            }
            else {
                eliminatedCount++;
            }
        }
        const now = Date.now();
        const durationMs = this.startTime > 0 ? Math.max(0, now - this.startTime) : 0;
        const snapshot = {
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
//# sourceMappingURL=MatchDataAggregator.js.map