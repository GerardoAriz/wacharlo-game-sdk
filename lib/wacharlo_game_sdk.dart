/// Wacha Game SDK Dart Companion Package (v1.1.0-rc1)
///
/// Lightweight Dart wrapper for `@wacharlo/game-sdk` (TypeScript single source of truth).
library;

export 'src/interop/wacha_sdk_js.dart';

/// Standard SDK Event names organized by namespace.
abstract class SDKEvent {
  // Core & Lifecycle
  static const String initialize = 'INITIALIZE';
  static const String gameStarted = 'GAME_STARTED';
  static const String gamePaused = 'GAME_PAUSED';
  static const String gameResumed = 'GAME_RESUMED';
  static const String gameOver = 'GAME_OVER';
  static const String dataUpdated = 'DATA_UPDATED';
  static const String achievementUnlocked = 'ACHIEVEMENT_UNLOCKED';
  static const String showLeaderboard = 'SHOW_LEADERBOARD';

  // ROOM_*
  static const String roomCreated = 'ROOM_CREATED';
  static const String roomJoined = 'ROOM_JOINED';
  static const String roomLeft = 'ROOM_LEFT';
  static const String roomClosed = 'ROOM_CLOSED';

  // MATCH_*
  static const String matchPreparing = 'MATCH_PREPARING';
  static const String countdownStarted = 'COUNTDOWN_STARTED';
  static const String matchStarted = 'MATCH_STARTED';
  static const String matchFinished = 'MATCH_FINISHED';
  static const String rematchRequested = 'REMATCH_REQUESTED';
  static const String rematchAccepted = 'REMATCH_ACCEPTED';

  // PLAYER_*
  static const String playerJoined = 'PLAYER_JOINED';
  static const String playerLeft = 'PLAYER_LEFT';
  static const String playerReady = 'PLAYER_READY';
  static const String scoreUpdated = 'SCORE_UPDATED';
  static const String playerDied = 'PLAYER_DIED';

  // SOCIAL_*
  static const String inviteFriend = 'INVITE_FRIEND';
  static const String shareRoom = 'SHARE_ROOM';
}

/// Standardized message envelope for Host communication.
class SDKEventEnvelope<T> {
  final String event;
  final int timestamp;
  final String? sessionId;
  final String? roomId;
  final T? payload;

  SDKEventEnvelope({
    required this.event,
    required this.timestamp,
    this.sessionId,
    this.roomId,
    this.payload,
  });

  Map<String, dynamic> toJson() => {
        'event': event,
        'timestamp': timestamp,
        if (sessionId != null) 'sessionId': sessionId,
        if (roomId != null) 'roomId': roomId,
        if (payload != null) 'payload': payload,
      };
}
