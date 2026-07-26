import { describe, it, expect } from 'vitest';
import { MatchDataAggregator } from '../../src/host/MatchDataAggregator';

describe('MatchDataAggregator', () => {
  it('initializes with roomId and player roster', () => {
    const aggregator = new MatchDataAggregator('ROOM-123', ['p1', 'p2', 'p3']);
    expect(aggregator.getRoomId()).toBe('ROOM-123');

    const snapshot = aggregator.getSnapshot();
    expect(snapshot.roomId).toBe('ROOM-123');
    expect(snapshot.players.length).toBe(3);
    expect(snapshot.aliveCount).toBe(3);
    expect(snapshot.eliminatedCount).toBe(0);
    expect(snapshot.eliminationOrder).toEqual([]);
  });

  it('throws TypeError if roomId is invalid', () => {
    expect(() => new MatchDataAggregator('')).toThrow(TypeError);
    expect(() => new MatchDataAggregator('   ')).toThrow(TypeError);
  });

  it('processes PLAYER_DIED exactly once per player ID', () => {
    const aggregator = new MatchDataAggregator('ROOM-1', ['p1', 'p2']);

    const firstResult = aggregator.processPlayerDied('p1', 100);
    expect(firstResult).toBe(true);

    const snapshot1 = aggregator.getSnapshot();
    expect(snapshot1.aliveCount).toBe(1);
    expect(snapshot1.eliminatedCount).toBe(1);
    expect(snapshot1.eliminationOrder).toEqual(['p1']);
    expect(snapshot1.finalScores['p1']).toBe(100);

    // Duplicate death event for p1 must return false and be ignored
    const duplicateResult = aggregator.processPlayerDied('p1', 200);
    expect(duplicateResult).toBe(false);

    const snapshot2 = aggregator.getSnapshot();
    expect(snapshot2.aliveCount).toBe(1);
    expect(snapshot2.eliminatedCount).toBe(1);
    expect(snapshot2.eliminationOrder).toEqual(['p1']);
    expect(snapshot2.finalScores['p1']).toBe(100); // score remained 100
  });

  it('ignores PLAYER_DIED for unknown player IDs', () => {
    const aggregator = new MatchDataAggregator('ROOM-1', ['p1', 'p2']);
    const result = aggregator.processPlayerDied('unknown_player');
    expect(result).toBe(false);
    expect(aggregator.getSnapshot().aliveCount).toBe(2);
  });

  it('updates player scores correctly', () => {
    const aggregator = new MatchDataAggregator('ROOM-1', ['p1', 'p2']);
    aggregator.updatePlayerScore('p1', 500);
    aggregator.updatePlayerScore('p2', 300);

    const snapshot = aggregator.getSnapshot();
    expect(snapshot.finalScores['p1']).toBe(500);
    expect(snapshot.finalScores['p2']).toBe(300);
  });

  it('returns immutable (Readonly) snapshot objects preventing mutation', () => {
    const aggregator = new MatchDataAggregator('ROOM-1', ['p1', 'p2']);
    const snapshot = aggregator.getSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.players)).toBe(true);
    expect(Object.isFrozen(snapshot.eliminationOrder)).toBe(true);

    // Mutations on returned objects should be prevented in standard TS runtime
    expect(() => {
      (snapshot as any).aliveCount = 999;
    }).toThrow();
  });
});
