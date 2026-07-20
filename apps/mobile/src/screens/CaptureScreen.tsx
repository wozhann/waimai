import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatYuan } from '@waimai/engine';
import { colors, shadow } from '../theme';
import {
  clearCaptures,
  getCaptures,
  isCaptureSupported,
  isServiceEnabled,
  openAccessibilitySettings,
  subscribeCaptures,
} from '../capture/liveCapture';
import type { CapturedOrder, ParsedBreakdown } from '../capture/types';

/** Labelled rows to render a parsed breakdown in a stable, readable order. */
const FIELDS: { key: keyof ParsedBreakdown; label: string; discount?: boolean }[] = [
  { key: 'subtotalFen', label: '商品小计' },
  { key: 'manjianFen', label: '满减', discount: true },
  { key: 'hongbaoFen', label: '红包', discount: true },
  { key: 'couponFen', label: '优惠券', discount: true },
  { key: 'deliveryFen', label: '配送费' },
  { key: 'packagingFen', label: '打包费' },
  { key: 'memberFen', label: '会员优惠', discount: true },
  { key: 'finalFen', label: '实付', discount: false },
];

export function CaptureScreen() {
  const [enabled, setEnabled] = useState(false);
  const [orders, setOrders] = useState<CapturedOrder[]>([]);

  const refresh = useCallback(async () => {
    setEnabled(await isServiceEnabled());
    const list = await getCaptures();
    // Most recent first.
    setOrders(list.slice().sort((a, b) => b.capturedAt - a.capturedAt));
  }, []);

  useEffect(() => {
    refresh();
    const unsub = subscribeCaptures(() => refresh());
    return unsub;
  }, [refresh]);

  if (!isCaptureSupported) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>实测比价</Text>
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            实测读价只在 Android App 版可用（需无障碍权限读取结算页）。当前是网页/演示版，
            请安装 Android 版后使用。
          </Text>
        </View>
      </View>
    );
  }

  const latestPerApp = rankLatestPerApp(orders);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>实测比价</Text>
      <Text style={styles.subtitle}>在各 App 结算页自动读取真实到手价</Text>

      <View style={[styles.statusRow, enabled ? styles.statusOn : styles.statusOff]}>
        <Text style={styles.statusText}>
          {enabled ? '✅ 读价服务已开启' : '⚠️ 读价服务未开启'}
        </Text>
        <Pressable style={styles.statusBtn} onPress={openAccessibilitySettings}>
          <Text style={styles.statusBtnText}>{enabled ? '设置' : '去开启'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <>
            {!enabled && (
              <Text style={styles.hint}>
                开启后，去美团 / 饿了么 / 淘宝闪购领好券、把同一份购物车放进各家结算页，
                回到这里即可看到真实价格对比。
              </Text>
            )}
            {latestPerApp.length >= 2 && (
              <View style={styles.compareCard}>
                <Text style={styles.compareTitle}>本次比价（各家最新）</Text>
                {latestPerApp.map((o, i) => (
                  <View key={o.id} style={styles.compareRow}>
                    <Text style={[styles.compareApp, i === 0 && styles.compareBest]}>
                      {i === 0 ? '🏆 ' : ''}
                      {o.appLabel}
                    </Text>
                    <Text style={[styles.comparePrice, i === 0 && styles.compareBest]}>
                      {formatYuan(o.parsed.finalFen!)}
                    </Text>
                  </View>
                ))}
                <Text style={styles.compareNote}>
                  最省 {latestPerApp[0]!.appLabel} · 省 {formatYuan(
                    latestPerApp[latestPerApp.length - 1]!.parsed.finalFen! -
                      latestPerApp[0]!.parsed.finalFen!,
                  )}
                </Text>
              </View>
            )}
            {orders.length > 0 && (
              <View style={styles.listHead}>
                <Text style={styles.hint}>抓取记录（{orders.length}）</Text>
                <Pressable onPress={() => clearCaptures().then(refresh)}>
                  <Text style={styles.clear}>清空</Text>
                </Pressable>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          enabled ? (
            <Text style={styles.empty}>还没有抓取记录。去 App 结算页看一眼就会出现在这里。</Text>
          ) : null
        }
        renderItem={({ item }) => <CaptureCard order={item} />}
      />
    </View>
  );
}

function CaptureCard({ order }: { order: CapturedOrder }) {
  const [showRaw, setShowRaw] = useState(false);
  const rows = FIELDS.filter((f) => order.parsed[f.key] !== undefined);

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardApp}>{order.appLabel}</Text>
        <Text style={styles.cardTime}>{new Date(order.capturedAt).toLocaleTimeString()}</Text>
      </View>

      {rows.length === 0 ? (
        <Text style={styles.cardWarn}>未能识别金额 — 展开原始文本以校准规则</Text>
      ) : (
        rows.map((f) => {
          const fen = order.parsed[f.key]!;
          return (
            <View key={f.key} style={styles.priceRow}>
              <Text style={styles.priceLabel}>{f.label}</Text>
              <Text style={[styles.priceVal, f.key === 'finalFen' && styles.priceFinal]}>
                {f.discount ? '-' : ''}
                {formatYuan(fen)}
              </Text>
            </View>
          );
        })
      )}

      <Pressable onPress={() => setShowRaw((v) => !v)}>
        <Text style={styles.rawToggle}>
          {showRaw ? '收起' : `原始文本（${order.texts.length}）`}
        </Text>
      </Pressable>
      {showRaw && (
        <View style={styles.rawBox}>
          {order.texts.map((t, i) => (
            <Text key={i} style={styles.rawText}>
              {t.id ? `[${t.id.split('/').pop()}] ` : ''}
              {t.text}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

/** Newest capture per app that has a parsed final price, ranked cheapest first. */
function rankLatestPerApp(orders: CapturedOrder[]): CapturedOrder[] {
  const latest = new Map<string, CapturedOrder>();
  for (const o of orders) {
    if (o.parsed.finalFen === undefined) continue;
    const prev = latest.get(o.packageName);
    if (!prev || o.capturedAt > prev.capturedAt) latest.set(o.packageName, o);
  }
  return [...latest.values()].sort((a, b) => a.parsed.finalFen! - b.parsed.finalFen!);
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 8 },
  subtitle: { fontSize: 14, color: colors.subtext, marginTop: 4, marginBottom: 12 },
  notice: { backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  noticeText: { fontSize: 14, color: colors.subtext, lineHeight: 21 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  statusOn: { backgroundColor: '#EAF7EE', borderColor: '#B7E1C3' },
  statusOff: { backgroundColor: '#FFF3E9', borderColor: '#FFD3AE' },
  statusText: { fontSize: 15, fontWeight: '700', color: colors.text },
  statusBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  statusBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hint: { fontSize: 13, color: colors.subtext, marginBottom: 10, lineHeight: 20 },
  compareCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  compareTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 10 },
  compareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  compareApp: { fontSize: 15, color: colors.text },
  comparePrice: { fontSize: 15, fontWeight: '600', color: colors.text },
  compareBest: { color: colors.good, fontWeight: '800' },
  compareNote: { fontSize: 13, color: colors.good, fontWeight: '600', marginTop: 8 },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clear: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardApp: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardTime: { fontSize: 12, color: colors.faint },
  cardWarn: { fontSize: 13, color: colors.subtext, fontStyle: 'italic' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  priceLabel: { fontSize: 14, color: colors.subtext },
  priceVal: { fontSize: 14, color: colors.text },
  priceFinal: { fontWeight: '800', color: colors.primary, fontSize: 15 },
  rawToggle: { fontSize: 12, color: colors.primary, marginTop: 10, fontWeight: '600' },
  rawBox: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  rawText: { fontSize: 11, color: colors.faint, lineHeight: 16 },
  empty: { textAlign: 'center', color: colors.faint, marginTop: 40, lineHeight: 20 },
});
