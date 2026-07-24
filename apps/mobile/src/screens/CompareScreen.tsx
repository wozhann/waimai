import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CATALOG,
  PLATFORM_LABELS,
  rankPlatforms,
  type Cart,
  type PriceProvider,
  type RankedResult,
  type UserProfile,
} from '@waimai/engine';
import { colors, platformColor } from '../theme';
import { BreakdownCard } from '../components/BreakdownCard';
import { openDeliveryApp } from '../capture/liveCapture';

interface Props {
  providers: PriceProvider[];
  cart: Cart;
  profile: UserProfile;
  onBack: () => void;
}

export function CompareScreen({ providers, cart, profile, onBack }: Props) {
  const [result, setResult] = useState<RankedResult | null>(null);
  const restaurant = CATALOG.find((r) => r.id === cart.restaurantId);

  // Re-ranks whenever the cart OR the user's personalization changes.
  useEffect(() => {
    let active = true;
    rankPlatforms(providers, cart, profile).then((r) => {
      if (active) setResult(r);
    });
    return () => {
      active = false;
    };
  }, [providers, cart, profile]);

  const dearest = result?.breakdowns.at(-1);

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ 修改订单</Text>
      </Pressable>
      <Text style={styles.title}>{restaurant?.name ?? '比价结果'}</Text>
      <Text style={styles.subtitle}>已按到手价从低到高排序 · 明细含满减/红包/配送/会员/补贴</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {result?.breakdowns.map((b, i) => (
          <BreakdownCard
            key={b.platform}
            breakdown={b}
            rank={i + 1}
            isCheapest={i === 0}
            savingVsDearest={dearest ? dearest.final - b.final : 0}
          />
        ))}

        {result && result.breakdowns.length > 0 && (
          <View style={styles.launchCard}>
            <Text style={styles.launchTitle}>去 App 下单</Text>
            <Text style={styles.launchHint}>
              打开对应 App 查看真实价格并下单。开启「实测」后，到结算页会自动读取真实到手价，
              用来核对这里的估算。
            </Text>
            <View style={styles.launchRow}>
              {result.breakdowns.map((b) => (
                <Pressable
                  key={b.platform}
                  style={[styles.launchBtn, { backgroundColor: platformColor(b.platform) }]}
                  onPress={() => openDeliveryApp(b.platform)}
                >
                  <Text style={styles.launchBtnText}>去{PLATFORM_LABELS[b.platform]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.note}>
          价格为模拟数据，用于演示比价引擎。真实到手价以各 App 结算页（或「实测」读取）为准。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  back: { paddingVertical: 8 },
  backText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4 },
  subtitle: { fontSize: 13, color: colors.subtext, marginTop: 4, marginBottom: 14 },
  note: { fontSize: 12, color: colors.faint, marginTop: 8, lineHeight: 18 },
  launchCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  launchTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  launchHint: { fontSize: 12, color: colors.subtext, marginTop: 4, lineHeight: 18 },
  launchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  launchBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  launchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
