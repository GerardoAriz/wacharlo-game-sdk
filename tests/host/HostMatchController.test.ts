import { describe, it, expect, vi } from 'vitest';
import { HostMatchController } from '../../src/host/HostMatchController';
import { EventManager } from '../../src/events/EventManager';
import { HostManager } from '../../src/host/HostManager';
import { SDKEvent, type MatchFinishedPayload } from '../../src/types/index';

describe('HostMatchController', () => {
  function createTestHost() {
    const events = new EventManager();
    const mockEnvelopeSender = vi.fn();
    const hostManager = new HostManager(events, mockEnvelopeSender, () => 'session-123');
    return { events, mockEnvelopeSender, hostManager };
  }

  it('initializes correctly and binds player death listener', () => {
    const { hostManager } = createTestHost();
    const controller = new HostMatchController({
      hostManager,
      roomId: 'ROOM-MATCH-1',
      playerIds: ['player1', 'player2'],
    });

    expect(controller.getRoomId()).toBe('ROOM-MATCH-1');
    expect(controller.isFinished()).toBe(false);
    expect(controller.getAggregator().isPlayerAlive('player1')).toBe(true);
    expect(controller.getAggregator().isPlayerAlive('player2')).toBe(true);

    controller.dispose();
  });

  it('processes PLAYER_DIED event, evaluates completion, and emits MATCH_FINISHED broadcast', () => {
    const { hostManager, mockEnvelopeSender } = createTestHost();

    const controller = new HostMatchController({
      hostManager,
      roomId: 'ROOM-MATCH-1',
      playerIds: ['p1', 'p2'],
    });

    let emittedFinishedPayload: MatchFinishedPayload | null = null;

    // Local subscriber to MATCH_FINISHED
    hostManager.on<MatchFinishedPayload>(SDKEvent.MATCH_FINISHED, payload => {
      emittedFinishedPayload = payload;
    });

    // Simulate p1 dying via HostManager event
    hostManager.emit(SDKEvent.PLAYER_DIED, {
      playerId: 'p1',
      roomId: 'ROOM-MATCH-1',
      score: 350,
    });

    expect(controller.isFinished()).toBe(true);

    // Verify envelope sent to Host transport
    const finishedCall = mockEnvelopeSender.mock.calls.find(
      call => call[0].event === SDKEvent.MATCH_FINISHED
    );
    expect(finishedCall).toBeDefined();

    const finishedEnvelope = finishedCall[0];
    expect(finishedEnvelope.roomId).toBe('ROOM-MATCH-1');

    const payload = finishedEnvelope.payload as MatchFinishedPayload;
    expect(payload.roomId).toBe('ROOM-MATCH-1');
    expect(payload.winners).toEqual(['p2']);
    expect(payload.eliminationOrder).toEqual(['p1']);
    expect(payload.finalScores['p1']).toBe(350);
    expect(payload.ruleName).toBe('last_alive');
    expect(payload.reason).toBe('last_survivor');
    expect(payload.placements.length).toBe(2);
    expect(payload.placements[0].playerId).toBe('p2');
    expect(payload.placements[0].rank).toBe(1);
    expect(payload.placements[1].playerId).toBe('p1');
    expect(payload.placements[1].rank).toBe(2);

    expect(emittedFinishedPayload).toEqual(payload);

    controller.dispose();
  });

  it('guarantees MATCH_FINISHED is emitted EXACTLY ONCE per match session', () => {
    const { hostManager, mockEnvelopeSender } = createTestHost();

    const controller = new HostMatchController({
      hostManager,
      roomId: 'ROOM-SINGLE-EMIT',
      playerIds: ['p1', 'p2', 'p3'],
    });

    // Emitting p1 death
    hostManager.emit(SDKEvent.PLAYER_DIED, { playerId: 'p1', roomId: 'ROOM-SINGLE-EMIT' });
    expect(controller.isFinished()).toBe(false);

    // Emitting p2 death -> triggers match finished (p3 survivor)
    hostManager.emit(SDKEvent.PLAYER_DIED, { playerId: 'p2', roomId: 'ROOM-SINGLE-EMIT' });
    expect(controller.isFinished()).toBe(true);

    const matchFinishedCount1 = mockEnvelopeSender.mock.calls.filter(
      call => call[0].event === SDKEvent.MATCH_FINISHED
    ).length;
    expect(matchFinishedCount1).toBe(1);

    // Duplicate call / subsequent player death (e.g. p3 death)
    hostManager.emit(SDKEvent.PLAYER_DIED, { playerId: 'p3', roomId: 'ROOM-SINGLE-EMIT' });
    controller.forceMatchFinish('manual_duplicate');

    const matchFinishedCount2 = mockEnvelopeSender.mock.calls.filter(
      call => call[0].event === SDKEvent.MATCH_FINISHED
    ).length;

    // Must still be EXACTLY 1 broadcast
    expect(matchFinishedCount2).toBe(1);

    controller.dispose();
  });

  it('ignores PLAYER_DIED events sent for other room IDs', () => {
    const { hostManager, mockEnvelopeSender } = createTestHost();

    const controller = new HostMatchController({
      hostManager,
      roomId: 'ROOM-MY-ROOM',
      playerIds: ['p1', 'p2'],
    });

    // Send event for a different room
    hostManager.emit(SDKEvent.PLAYER_DIED, { playerId: 'p1', roomId: 'OTHER-ROOM' });

    expect(controller.isFinished()).toBe(false);
    expect(controller.getAggregator().isPlayerAlive('p1')).toBe(true);

    controller.dispose();
  });
});
