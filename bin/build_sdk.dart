import 'dart:io';
import 'dart:isolate';
import '../lib/validation_utils.dart';

void main(List<String> args) async {
  print('========================================');
  print('Wacha SDK Builder & Bootstrapper');
  print('========================================');

  // 1. Resolve SDK path dynamically
  String? sdkPath;
  try {
    final libUri = await Isolate.resolvePackageUri(Uri.parse('package:wacharlo_game_sdk/'));
    if (libUri != null) {
      sdkPath = Directory.fromUri(libUri).parent.path;
    }
  } catch (_) {}

  // Fallback: Check Platform.script path
  if (sdkPath == null) {
    try {
      final scriptPath = Platform.script.toFilePath();
      if (scriptPath.contains('bin/build_sdk.dart') || scriptPath.contains('bin\\build_sdk.dart')) {
        sdkPath = Directory(scriptPath).parent.parent.path;
      }
    } catch (_) {}
  }

  // Fallback: Check current working directory
  if (sdkPath == null) {
    if (File('package.json').existsSync()) {
      sdkPath = Directory.current.path;
    }
  }

  if (sdkPath == null) {
    print('\n[ERROR] Wacharlo Game SDK directory could not be resolved.');
    exit(1);
  }

  final sdkDir = Directory(sdkPath);
  final resolvedSdkPath = sdkDir.absolute.path;
  print('Resolved SDK path: $resolvedSdkPath');

  // 2. Resolve output path
  String outfile = 'web/wacha-sdk.js';
  for (int i = 0; i < args.length; i++) {
    if ((args[i] == '--out' || args[i] == '-o') && i + 1 < args.length) {
      outfile = args[i + 1];
      break;
    }
  }
  final absoluteOutFile = File(outfile).absolute.path;

  // 3. Pre-build validations
  print('Running pre-build validation...');

  if (!await ValidationUtils.checkFlutter()) {
    print('\n[ERROR] Flutter CLI is not detected.');
    print('Fix: Please install Flutter (https://docs.flutter.dev/get-started/install) and add it to your PATH.');
    exit(1);
  }

  if (!await ValidationUtils.checkDart()) {
    print('\n[ERROR] Dart SDK is not detected.');
    print('Fix: Please install Dart or Flutter and ensure it is available in your environment PATH.');
    exit(1);
  }

  if (!await ValidationUtils.checkNode()) {
    print('\n[ERROR] Node.js is not detected.');
    print('Fix: Please install Node.js (https://nodejs.org) to support bundling the TypeScript SDK.');
    exit(1);
  }

  if (!ValidationUtils.checkSdkDir(resolvedSdkPath)) {
    print('\n[ERROR] Wacharlo Game SDK directory could not be located at:');
    print('  $resolvedSdkPath');
    exit(1);
  }

  if (!ValidationUtils.checkPackageJson(resolvedSdkPath)) {
    print('\n[ERROR] Invalid SDK directory: package.json was not found at:');
    print('  $resolvedSdkPath');
    exit(1);
  }

  // 4. Version Stamping & Verification
  final packageJsonFile = File('$resolvedSdkPath/package.json');
  final packageJsonContent = packageJsonFile.readAsStringSync();
  final versionRegex = RegExp(r'"version":\s*"([^"]+)"');
  final match = versionRegex.firstMatch(packageJsonContent);
  if (match == null) {
    print('\n[ERROR] Could not extract version from package.json');
    exit(1);
  }
  final sdkVersion = match.group(1)!;
  print('SDK Version: $sdkVersion');

  // Verify and auto-stamp src/version/index.ts
  final versionTsFile = File('$resolvedSdkPath/src/version/index.ts');
  if (versionTsFile.existsSync()) {
    final versionTsContent = versionTsFile.readAsStringSync();
    if (!versionTsContent.contains("export const SDK_VERSION = '$sdkVersion';") &&
        !versionTsContent.contains('export const SDK_VERSION = "$sdkVersion";')) {
      print('\n[WARNING] SDK version mismatch between package.json and src/version/index.ts.');
      print('Auto-stamping src/version/index.ts with version: $sdkVersion');
      try {
        final newTsContent = '''/**
 * SDK Version
 *
 * Single source of truth for the @wacharlo/game-sdk version string.
 * This value is embedded in every outgoing message so that the Flutter host
 * can assert compatibility with `GameConfig.minSDKVersion`.
 *
 * Follows Semantic Versioning: MAJOR.MINOR.PATCH[-prerelease]
 */
export const SDK_VERSION = '$sdkVersion';
''';
        versionTsFile.writeAsStringSync(newTsContent);
        print('✓ src/version/index.ts updated successfully.');
      } catch (e) {
        print('[ERROR] Failed to auto-update src/version/index.ts: $e');
      }
    }
  }

  // 5. Verify node_modules in SDK
  final sdkNodeModules = Directory('$resolvedSdkPath/node_modules');
  if (!sdkNodeModules.existsSync()) {
    print('node_modules not found in SDK folder. Installing SDK dependencies...');
    final installResult = await Process.run(
      'npm',
      ['install'],
      workingDirectory: resolvedSdkPath,
      runInShell: true,
    );
    if (installResult.exitCode != 0) {
      print('\n[ERROR] Failed to install SDK dependencies (npm install):');
      print(installResult.stderr);
      exit(1);
    }
    print('SDK dependencies installed successfully.');
  }

  if (!await ValidationUtils.checkEsbuild(resolvedSdkPath)) {
    print('\n[ERROR] esbuild compiler could not be executed.');
    print('Fix: Ensure npm dependencies are installed inside the SDK directory or npx is available.');
    exit(1);
  }

  print('Validation passed successfully.');

  // 6. Create temporary TypeScript entry file in SDK root
  final tempEntryFile = File('$resolvedSdkPath/temp-sdk-entry.ts');
  final entryContent = '''
import { GameSDK } from './src/sdk/GameSDK';
(window as any).GameSDK = GameSDK;
''';

  try {
    tempEntryFile.writeAsStringSync(entryContent);
    print('Generated temporary bundler entry point: ${tempEntryFile.path}');
  } catch (e) {
    print('\n[ERROR] Failed to write temporary bundler entry point: $e');
    exit(1);
  }

  // 7. Bundle using esbuild
  print('Bundling SDK into $outfile...');
  final String banner = '/* @wacharlo/game-sdk v$sdkVersion - Built on ${DateTime.now().toUtc().toIso8601String()} */';

  String esbuildExecutable = 'npx';
  List<String> esbuildArgs = [];

  final String localEsbuildPath = Platform.isWindows
      ? '$resolvedSdkPath/node_modules/esbuild/esbuild.exe'
      : '$resolvedSdkPath/node_modules/esbuild/bin/esbuild';

  final localEsbuildFile = File(localEsbuildPath);
  if (localEsbuildFile.existsSync()) {
    print('Using local esbuild binary: ${localEsbuildFile.path}');
    esbuildExecutable = localEsbuildFile.path;
    esbuildArgs = [
      'temp-sdk-entry.ts',
      '--bundle',
      '--outfile=$absoluteOutFile',
      '--banner:js=$banner',
    ];
  } else {
    print('Local esbuild binary not found. Falling back to npx esbuild...');
    esbuildExecutable = 'npx';
    esbuildArgs = [
      '-y',
      'esbuild',
      'temp-sdk-entry.ts',
      '--bundle',
      '--outfile=$absoluteOutFile',
      '--banner:js=$banner',
    ];
  }

  final buildResult = await Process.run(
    esbuildExecutable,
    esbuildArgs,
    workingDirectory: resolvedSdkPath,
    runInShell: true,
  );

  // Clean up temporary entry file
  if (tempEntryFile.existsSync()) {
    try {
      tempEntryFile.deleteSync();
    } catch (_) {}
  }

  if (buildResult.exitCode != 0) {
    print('\n[ERROR] SDK Bundling compilation failed:');
    print('Error output: ${buildResult.stderr}');
    print('Output logs: ${buildResult.stdout}');
    exit(1);
  }

  print('Success! SDK successfully compiled and copied to: $outfile');
  print('========================================');
}
