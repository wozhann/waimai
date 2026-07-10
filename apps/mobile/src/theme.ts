import type { Platform } from '@waimai/engine';

export const colors = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  text: '#141414',
  subtext: '#6B7280',
  faint: '#9CA3AF',
  border: '#E7E8EB',
  primary: '#FF5A1F',
  good: '#12A150',
  meituan: '#FFB400',
  eleme: '#0A8CFF',
  jd: '#E1251B',
} as const;

export function platformColor(p: Platform): string {
  return { meituan: colors.meituan, eleme: colors.eleme, jd: colors.jd }[p];
}

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;
