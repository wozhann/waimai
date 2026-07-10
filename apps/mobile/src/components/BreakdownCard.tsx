import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatYuan, type PriceBreakdown } from '@waimai/engine';
import { colors, shadow } from '../theme';
import { PlatformBadge } from './PlatformBadge';

interface Props {
  breakdown: PriceBreakdown;
  rank: number;
  isCheapest: boolean;
  savingVsDearest?: number;
}

/** One platform's result: headline price + an expandable itemized breakdown. */
export function BreakdownCard({ breakdown, rank, isCheapest, savingVsDearest }: Props) {
  const [open, setOpen] = useState(isCheapest);

  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      style={[styles.card, isCheapest && styles.cheapestCard]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.rank}>{rank}</Text>
          <PlatformBadge platform={breakdown.platform} />
          {isCheapest && (
            <View style={styles.cheapestTag}>
              <Text style={styles.cheapestTagText}>最低价</Text>
            </View>
          )}
        </View>
        <Text style={[styles.price, isCheapest && styles.cheapestPrice]}>
          {formatYuan(breakdown.final)}
        </Text>
      </View>

      {isCheapest && savingVsDearest ? (
        <Text style={styles.saving}>比最贵平台省 {formatYuan(savingVsDearest)}</Text>
      ) : null}

      {open && (
        <View style={styles.steps}>
          {breakdown.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={[styles.stepAmount, step.amount < 0 && styles.discount]}>
                {step.amount < 0 ? '−' : ''}
                {formatYuan(Math.abs(step.amount))}
              </Text>
            </View>
          ))}
          <View style={[styles.stepRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>实付</Text>
            <Text style={styles.totalAmount}>{formatYuan(breakdown.final)}</Text>
          </View>
        </View>
      )}

      <Text style={styles.hint}>{open ? '收起明细 ▲' : '查看明细 ▼'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  cheapestCard: { borderColor: colors.good, borderWidth: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rank: { fontSize: 15, fontWeight: '700', color: colors.faint, width: 18 },
  cheapestTag: {
    backgroundColor: colors.good,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  cheapestTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  price: { fontSize: 22, fontWeight: '800', color: colors.text },
  cheapestPrice: { color: colors.good },
  saving: { marginTop: 6, color: colors.good, fontWeight: '600', fontSize: 13 },
  steps: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  stepLabel: { color: colors.subtext, fontSize: 14 },
  stepAmount: { color: colors.text, fontSize: 14, fontVariant: ['tabular-nums'] },
  discount: { color: colors.good },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 8 },
  totalLabel: { fontWeight: '700', color: colors.text, fontSize: 15 },
  totalAmount: { fontWeight: '800', color: colors.text, fontSize: 16 },
  hint: { marginTop: 10, color: colors.faint, fontSize: 12, textAlign: 'center' },
});
