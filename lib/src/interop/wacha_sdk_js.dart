import 'dart:js_interop';

@JS('window.GameSDK')
extension type JSGameSDK._(JSObject _) implements JSObject {
  external static JSGameSDK create(JSObject config, [JSObject? overrides]);

  external bool isInitialized();
  external void initialize();
  external void adoptSessionId(String sessionId);
  external void startSession();
  external void pause();
  external void resume();
  external void gameOver([JSObject? result]);
  external void report(JSObject data);
  external void unlockAchievement(String id);
  external void showLeaderboard([JSObject? payload]);
  external void dispose();

  external JSHostManager get host;
  external JSSocialManager get social;
  external String get version;
}

@JS()
extension type JSHostManager._(JSObject _) implements JSObject {
  external void emit(String event, [JSAny? payload, String? roomId]);
  external JSFunction on(String event, JSFunction callback);
  external void off(String event, JSFunction callback);
  external void clear();
}

@JS()
extension type JSSocialManager._(JSObject _) implements JSObject {
  external JSPromise inviteFriend(String roomId, [JSAny? payload]);
  external JSPromise shareRoom(String roomId, [JSAny? payload]);
}
