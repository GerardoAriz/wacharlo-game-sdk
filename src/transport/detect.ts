import { Transport } from './Transport';
import { FlutterWebViewTransport } from './FlutterWebViewTransport';
import { BrowserTransport } from './BrowserTransport';
import { StandaloneTransport } from './StandaloneTransport';
import { MockTransport } from './MockTransport';

/**
 * Automatically detects the current environment and instantiates the correct transport.
 */
export function detectTransport(): Transport {
  if (typeof window === 'undefined') {
    // Node.js or SSR environment (or unit tests)
    return new MockTransport();
  }

  // 1. Flutter WebView Priority
  const isFlutter = !!((window as any).WachaPlayChannel || (window as any).flutter_inappwebview);
  if (isFlutter) {
    return new FlutterWebViewTransport();
  }

  // 2. Embedded Iframe Priority
  const isEmbedded = typeof window.parent !== 'undefined' && window.parent !== null && window.parent !== window;
  if (isEmbedded) {
    return new BrowserTransport();
  }

  // 3. Localhost Development & Testing Fallback
  const hostname = window.location.hostname || '';
  const isLocalhost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    hostname === '[::1]';

  if (isLocalhost) {
    return new MockTransport();
  }

  // 4. Standalone Browser Default
  return new StandaloneTransport();
}
