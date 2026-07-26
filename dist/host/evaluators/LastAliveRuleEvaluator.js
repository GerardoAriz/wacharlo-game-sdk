/**
 * LastAliveRuleEvaluator
 *
 * Stateless, deterministic match rule evaluator for elimination / battle royale games (e.g. Rope Rush).
 *
 * Completion condition: `aliveCount <= (totalPlayers > 1 ? 1 : 0)`
 * Winners: The single remaining survivor, or tie-break by score / last to die if all eliminated simultaneously.
 */
export class LastAliveRuleEvaluator {
    name = 'last_alive';
    isMatchComplete(snapshot) {
        const total = snapshot.players.length;
        if (total === 0)
            return true;
        const threshold = total > 1 ? 1 : 0;
        return snapshot.aliveCount <= threshold;
    }
    evaluateResult(snapshot) {
        const survivors = snapshot.players.filter(p => p.isAlive);
        const eliminated = snapshot.players
            .filter(p => !p.isAlive)
            .sort((a, b) => (b.deathOrder ?? 0) - (a.deathOrder ?? 0)); // reverse elimination order (last to die first)
        const placements = [];
        let winners = [];
        let reason = 'all_eliminated';
        if (survivors.length === 1) {
            const winner = survivors[0];
            winners = [winner.playerId];
            reason = 'last_survivor';
            placements.push({
                playerId: winner.playerId,
                rank: 1,
                score: winner.score,
                isSurvivor: true,
                teamId: winner.teamId,
            });
            eliminated.forEach((p, idx) => {
                placements.push({
                    playerId: p.playerId,
                    rank: idx + 2,
                    score: p.score,
                    isSurvivor: false,
                    eliminatedAt: p.diedAt,
                    teamId: p.teamId,
                });
            });
        }
        else if (survivors.length > 1) {
            // Multiple survivors (e.g. timeout) - rank by score
            const sortedSurvivors = [...survivors].sort((a, b) => b.score - a.score);
            const topScore = sortedSurvivors[0]?.score ?? 0;
            winners = sortedSurvivors.filter(p => p.score === topScore).map(p => p.playerId);
            reason = 'survivors_remaining';
            let currentRank = 1;
            sortedSurvivors.forEach(p => {
                placements.push({
                    playerId: p.playerId,
                    rank: currentRank++,
                    score: p.score,
                    isSurvivor: true,
                    teamId: p.teamId,
                });
            });
            eliminated.forEach(p => {
                placements.push({
                    playerId: p.playerId,
                    rank: currentRank++,
                    score: p.score,
                    isSurvivor: false,
                    eliminatedAt: p.diedAt,
                    teamId: p.teamId,
                });
            });
        }
        else {
            // 0 survivors (all eliminated)
            if (eliminated.length > 0) {
                const topEliminated = eliminated[0];
                winners = [topEliminated.playerId];
                reason = 'all_eliminated';
                eliminated.forEach((p, idx) => {
                    placements.push({
                        playerId: p.playerId,
                        rank: idx + 1,
                        score: p.score,
                        isSurvivor: false,
                        eliminatedAt: p.diedAt,
                        teamId: p.teamId,
                    });
                });
            }
        }
        return {
            winners,
            placements,
            ruleName: this.name,
            reason,
        };
    }
}
//# sourceMappingURL=LastAliveRuleEvaluator.js.map