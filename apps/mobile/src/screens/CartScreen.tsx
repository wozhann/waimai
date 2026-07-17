import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CATALOG,
  PLATFORM_LABELS,
  formatYuan,
  parseSmartQuery,
  suggestCombos,
  yuan,
  type Cart,
  type ComboSuggestion,
  type PriceProvider,
  type UserProfile,
} from '@waimai/engine';
import { colors, shadow } from '../theme';

interface Props {
  restaurantId: string;
  providers: PriceProvider[];
  profile: UserProfile;
  onBack: () => void;
  onCompare: (cart: Cart) => void;
}

export function CartScreen({ restaurantId, providers, profile, onBack, onCompare }: Props) {
  const restaurant = useMemo(
    () => CATALOG.find((r) => r.id === restaurantId),
    [restaurantId],
  );
  const [qty, setQty] = useState<Record<string, number>>({});
  const [showSuggest, setShowSuggest] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [suggestions, setSuggestions] = useState<ComboSuggestion[]>([]);

  useEffect(() => {
    if (!showSuggest) return;
    let active = true;
    const filters = parseSmartQuery(filterText) ?? undefined;
    suggestCombos(providers, restaurantId, profile, { filters, limit: 3 }).then((s) => {
      if (active) setSuggestions(s);
    });
    return () => {
      active = false;
    };
  }, [showSuggest, filterText, providers, profile, restaurantId]);

  if (!restaurant) return null;

  const setDish = (dishId: string, delta: number) =>
    setQty((prev) => {
      const next = Math.max(0, (prev[dishId] ?? 0) + delta);
      return { ...prev, [dishId]: next };
    });

  const lines = restaurant.dishes
    .map((d) => ({ dishId: d.id, qty: qty[d.id] ?? 0 }))
    .filter((l) => l.qty > 0);

  const referenceTotal = restaurant.dishes.reduce(
    (sum, d) => sum + yuan(d.basePriceYuan) * (qty[d.id] ?? 0),
    0,
  );
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ 返回</Text>
      </Pressable>
      <Text style={styles.title}>{restaurant.name}</Text>
      <Text style={styles.subtitle}>选择菜品（价格为参考价，各平台到手价将在下一步比较）</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Pressable style={styles.suggestToggle} onPress={() => setShowSuggest((v) => !v)}>
          <Text style={styles.suggestToggleText}>
            {showSuggest ? '收起智能配单 ▴' : '智能配单：全组合按到手价排序 ▾'}
          </Text>
        </Pressable>

        {showSuggest && (
          <View style={styles.suggestBox}>
            <TextInput
              style={styles.filterInput}
              placeholder="可选过滤：要汉堡 不要可乐"
              placeholderTextColor={colors.faint}
              value={filterText}
              onChangeText={setFilterText}
            />
            {suggestions.length === 0 ? (
              <Text style={styles.suggestEmpty}>没有组合能满足这些条件</Text>
            ) : (
              suggestions.map((s, i) => (
                <Pressable
                  key={s.dishes.map((d) => d.dishId).join('+')}
                  style={styles.suggestRow}
                  onPress={() => onCompare(s.cart)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestDishes}>
                      {i + 1}. {s.dishes.map((d) => d.name).join(' + ')}
                    </Text>
                    <Text style={styles.suggestMeta}>
                      最低 {formatYuan(s.cheapest.final)} · {PLATFORM_LABELS[s.cheapest.platform]}
                      {s.maxSaving > 0 ? ` · 比最贵平台省 ${formatYuan(s.maxSaving)}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.suggestCta}>比价 ›</Text>
                </Pressable>
              ))
            )}
          </View>
        )}

        {restaurant.dishes.map((d) => (
          <View key={d.id} style={styles.dishRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dishName}>{d.name}</Text>
              <Text style={styles.dishPrice}>{formatYuan(yuan(d.basePriceYuan))}</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepBtn, (qty[d.id] ?? 0) === 0 && styles.stepBtnDisabled]}
                onPress={() => setDish(d.id, -1)}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qty}>{qty[d.id] ?? 0}</Text>
              <Pressable style={styles.stepBtn} onPress={() => setDish(d.id, 1)}>
                <Text style={styles.stepBtnText}>＋</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>参考小计（{itemCount} 件）</Text>
          <Text style={styles.footerTotal}>{formatYuan(referenceTotal)}</Text>
        </View>
        <Pressable
          style={[styles.compareBtn, itemCount === 0 && styles.compareBtnDisabled]}
          disabled={itemCount === 0}
          onPress={() => onCompare({ restaurantId, lines })}
        >
          <Text style={styles.compareBtnText}>比较各平台价格</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  back: { paddingVertical: 8 },
  backText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4 },
  subtitle: { fontSize: 13, color: colors.subtext, marginTop: 4, marginBottom: 12 },
  suggestToggle: { paddingVertical: 6, marginBottom: 8 },
  suggestToggleText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  suggestBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
  },
  filterInput: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    color: colors.text,
  },
  suggestEmpty: { color: colors.faint, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  suggestDishes: { fontSize: 14, fontWeight: '600', color: colors.text },
  suggestMeta: { fontSize: 13, color: colors.good, marginTop: 3, fontWeight: '600' },
  suggestCta: { fontSize: 14, fontWeight: '700', color: colors.primary, marginLeft: 8 },
  dishRow: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dishName: { fontSize: 16, fontWeight: '600', color: colors.text },
  dishPrice: { fontSize: 14, color: colors.subtext, marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { backgroundColor: colors.border },
  stepBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  qty: { fontSize: 17, fontWeight: '700', color: colors.text, minWidth: 18, textAlign: 'center' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow,
  },
  footerLabel: { fontSize: 12, color: colors.subtext },
  footerTotal: { fontSize: 20, fontWeight: '800', color: colors.text },
  compareBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
  },
  compareBtnDisabled: { backgroundColor: colors.faint },
  compareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
