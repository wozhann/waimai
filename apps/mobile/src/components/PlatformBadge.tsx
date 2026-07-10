import { StyleSheet, Text, View } from 'react-native';
import { PLATFORM_LABELS, type Platform } from '@waimai/engine';
import { platformColor } from '../theme';

export function PlatformBadge({ platform, small }: { platform: Platform; small?: boolean }) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: platformColor(platform) },
        small && styles.small,
      ]}
    >
      <Text style={[styles.text, small && styles.smallText]}>{PLATFORM_LABELS[platform]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  small: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  text: { color: '#fff', fontWeight: '700', fontSize: 14 },
  smallText: { fontSize: 11 },
});
