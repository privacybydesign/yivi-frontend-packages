export type UserAgentType = 'nodejs' | 'Android' | 'iOS' | 'Desktop';

interface WindowWithMSStream extends Window {
  MSStream?: unknown;
  MSInputMethodContext?: unknown;
}

interface DocumentWithDocumentMode extends Document {
  documentMode?: number;
}

export default function userAgent(): UserAgentType {
  if (typeof window === 'undefined') return 'nodejs';

  const win = window as WindowWithMSStream;
  const doc = document as DocumentWithDocumentMode;

  // IE11 doesn't have window.navigator, test differently
  // https://stackoverflow.com/questions/21825157/internet-explorer-11-detection
  if (!!win.MSInputMethodContext && !!doc.documentMode) return 'Desktop';

  if (/Android/i.test(window.navigator.userAgent)) {
    return 'Android';
  }

  // https://stackoverflow.com/questions/9038625/detect-if-device-is-ios
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !win.MSStream) return 'iOS';

  // https://stackoverflow.com/questions/57776001/how-to-detect-ipad-pro-as-ipad-using-javascript
  if (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints && navigator.maxTouchPoints > 2) return 'iOS';

  // Neither Android nor iOS, assuming desktop
  return 'Desktop';
}
