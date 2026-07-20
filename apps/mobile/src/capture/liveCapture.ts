import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { CapturedOrder } from './types';

interface WaimaiLiveCaptureNative {
  getCaptures(): Promise<string>;
  clearCaptures(): Promise<boolean>;
  isServiceEnabled(): Promise<boolean>;
  openAccessibilitySettings(): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const native = NativeModules.WaimaiLiveCapture as WaimaiLiveCaptureNative | undefined;

/**
 * True only on an Android build that actually bundles the native module. On web
 * (PWA) and iOS this is false, and every function below no-ops safely — the
 * capture feature simply doesn't exist there.
 */
export const isCaptureSupported = Platform.OS === 'android' && !!native;

export async function getCaptures(): Promise<CapturedOrder[]> {
  if (!native) return [];
  try {
    return JSON.parse(await native.getCaptures()) as CapturedOrder[];
  } catch {
    return [];
  }
}

export async function clearCaptures(): Promise<void> {
  if (native) await native.clearCaptures();
}

export async function isServiceEnabled(): Promise<boolean> {
  return native ? native.isServiceEnabled() : false;
}

export function openAccessibilitySettings(): void {
  native?.openAccessibilitySettings();
}

/** Live updates as new checkout screens are captured while the app is foreground. */
export function subscribeCaptures(onCapture: (order: CapturedOrder) => void): () => void {
  if (!native) return () => {};
  const emitter = new NativeEventEmitter(native as never);
  const sub = emitter.addListener('waimaiCapture', (json: string) => {
    try {
      onCapture(JSON.parse(json) as CapturedOrder);
    } catch {
      /* ignore malformed frame */
    }
  });
  return () => sub.remove();
}
