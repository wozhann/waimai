import { Linking, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { Platform as DeliveryPlatform } from '@waimai/engine';
import type { CapturedOrder } from './types';

interface WaimaiLiveCaptureNative {
  getCaptures(): Promise<string>;
  clearCaptures(): Promise<boolean>;
  isServiceEnabled(): Promise<boolean>;
  openAccessibilitySettings(): void;
  openApp(packages: string[]): Promise<string | null>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

/**
 * Which app(s) to open per platform. Android tries the packages in order
 * (dedicated 外卖 app first); every build falls back to the app's website.
 */
const APP_TARGETS: Record<DeliveryPlatform, { packages: string[]; web: string }> = {
  meituan: {
    packages: ['com.sankuai.meituan.takeoutnew', 'com.sankuai.meituan'],
    web: 'https://waimai.meituan.com/',
  },
  eleme: { packages: ['me.ele'], web: 'https://www.ele.me/' },
  jd: { packages: ['com.jingdong.app.mall'], web: 'https://www.jd.com/' },
};

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

/**
 * Open the delivery app for `platform` so the user can check the real price and
 * order. Android launches the installed app (its home/entry — no deep link into
 * another app); if it isn't installed, or on web/iOS, opens the app's website.
 * Resolves true if something opened.
 */
export async function openDeliveryApp(platform: DeliveryPlatform): Promise<boolean> {
  const target = APP_TARGETS[platform];
  if (native) {
    try {
      if (await native.openApp(target.packages)) return true;
    } catch {
      /* fall through to the web fallback */
    }
  }
  try {
    await Linking.openURL(target.web);
    return true;
  } catch {
    return false;
  }
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
