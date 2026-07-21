import 'dart:io';

/// Helper utility class containing checks to validate the local developer environment.
class ValidationUtils {
  /// Checks if a command can be executed successfully with the given [args].
  /// Returns `true` if it completed with exit code 0, `false` otherwise.
  static Future<bool> isCommandAvailable(String command, {List<String> args = const ['--version']}) async {
    try {
      final result = await Process.run(command, args, runInShell: true);
      return result.exitCode == 0;
    } catch (_) {
      return false;
    }
  }

  /// Verifies if Flutter is installed in the current shell context.
  static Future<bool> checkFlutter() => isCommandAvailable('flutter');

  /// Verifies if Dart is installed in the current shell context.
  static Future<bool> checkDart() => isCommandAvailable('dart');

  /// Verifies if Node.js is installed in the current shell context.
  static Future<bool> checkNode() => isCommandAvailable('node');

  /// Verifies if the SDK directory exists at [path].
  static bool checkSdkDir(String path) {
    if (path.isEmpty) return false;
    return Directory(path).existsSync();
  }

  /// Verifies if the `package.json` file is present in the SDK directory at [sdkPath].
  static bool checkPackageJson(String sdkPath) {
    if (sdkPath.isEmpty) return false;
    return File('$sdkPath/package.json').existsSync();
  }

  /// Verifies if the esbuild compiler is executable locally or remotely via npx.
  static Future<bool> checkEsbuild(String sdkPath) async {
    final candidatePaths = Platform.isWindows
        ? [
            '$sdkPath/node_modules/esbuild/esbuild.exe',
            '$sdkPath/node_modules/.bin/esbuild.cmd',
          ]
        : [
            '$sdkPath/node_modules/.bin/esbuild',
            '$sdkPath/node_modules/esbuild/bin/esbuild',
          ];

    for (final candidate in candidatePaths) {
      if (File(candidate).existsSync()) {
        if (await isCommandAvailable(candidate, args: ['--version'])) {
          return true;
        }
      }
    }

    return isCommandAvailable('npx', args: ['-y', 'esbuild', '--version']);
  }
}
