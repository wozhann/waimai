import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  PLATFORM_LABELS,
  formatYuan,
  parseNaturalQuery,
  parseSmartQuery,
  searchAll,
  smartSearch,
  suggestByIntent,
  type Cart,
  type IntentSuggestion,
  type PriceProvider,
  type RestaurantSummary,
  type SmartMatch,
  type UserProfile,
} from '@waimai/engine';
import { colors, shadow } from '../theme';
import { PlatformBadge } from '../components/PlatformBadge';

type Mode = 'store' | 'intent';

interface Props {
  providers: PriceProvider[];
  profile: UserProfile;
  onSelect: (restaurantId: string) => void;
  /** Jump straight to the ranked comparison with a pre-built cart. */
  onCompare: (cart: Cart) => void;
}

export function SearchScreen({ providers, profile, onSelect, onCompare }: Props) {
  const [mode, setMode] = useState<Mode>('store');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>外卖比价</Text>
      <Text style={styles.subtitle}>一次搜索，比较各平台到手价</Text>

      <View style={styles.segment}>
        <SegmentButton label="找店铺" active={mode === 'store'} onPress={() => setMode('store')} />
        <SegmentButton label="说需求" active={mode === 'intent'} onPress={() => setMode('intent')} />
      </View>

      {mode === 'store' ? (
        <StoreSearch providers={providers} onSelect={onSelect} onCompare={onCompare} />
      ) : (
        <IntentSearch providers={providers} profile={profile} onCompare={onCompare} />
      )}
    </View>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.segBtn, active && styles.segBtnActive]} onPress={onPress}>
      <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
    </Pressable>
  );
}

/** Store / dish search, including 要/不要 smart parsing. */
function StoreSearch({
  providers,
  onSelect,
  onCompare,
}: {
  providers: PriceProvider[];
  onSelect: (id: string) => void;
  onCompare: (cart: Cart) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RestaurantSummary[]>([]);
  const [smartResults, setSmartResults] = useState<SmartMatch[] | null>(null);

  useEffect(() => {
    let active = true;
    const smart = parseSmartQuery(query);
    if (smart && smart.include.length > 0) {
      smartSearch(providers, smart).then((m) => active && setSmartResults(m));
    } else {
      setSmartResults(null);
      searchAll(providers, query).then((h) => active && setResults(h));
    }
    return () => {
      active = false;
    };
  }, [providers, query]);

  return (
    <>
      <TextInput
        style={styles.input}
        placeholder="搜店铺，或点单：要汉堡 不要可乐"
        placeholderTextColor={colors.faint}
        value={query}
        onChangeText={setQuery}
      />
      {smartResults ? (
        <FlatList
          data={smartResults}
          keyExtractor={(m) => m.restaurant.restaurantId}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListHeaderComponent={
            <Text style={styles.hint}>智能点单：已按「要 / 不要」自动配好一份，点击直接比价</Text>
          }
          ListEmptyComponent={<Text style={styles.empty}>没有店铺能凑齐这一单</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => onCompare(item.cart)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.restaurant.name}</Text>
                <Text style={styles.cuisine}>
                  {item.restaurant.cuisine} · {item.restaurant.distanceKm}km
                </Text>
                <Text style={styles.picked}>
                  已选：{item.pickedDishes.map((d) => d.name).join(' + ')}
                </Text>
                <View style={styles.badges}>
                  {item.restaurant.platforms.map((p) => (
                    <PlatformBadge key={p} platform={p} small />
                  ))}
                </View>
              </View>
              <Text style={styles.cta}>比价 ›</Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => r.restaurantId}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<Text style={styles.empty}>没有找到匹配的店铺</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => onSelect(item.restaurantId)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.cuisine}>
                  {item.cuisine} · {item.distanceKm}km
                </Text>
                <View style={styles.badges}>
                  {item.platforms.map((p) => (
                    <PlatformBadge key={p} platform={p} small />
                  ))}
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
        />
      )}
    </>
  );
}

/** Free-text craving → cross-restaurant, budget-aware, ranked suggestions. */
function IntentSearch({
  providers,
  profile,
  onCompare,
}: {
  providers: PriceProvider[];
  profile: UserProfile;
  onCompare: (cart: Cart) => void;
}) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [results, setResults] = useState<IntentSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!submitted.trim()) {
      setResults(null);
      return;
    }
    let active = true;
    setLoading(true);
    const query = parseNaturalQuery(submitted);
    suggestByIntent(providers, profile, query).then((r) => {
      if (active) {
        setResults(r);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [providers, profile, submitted]);

  const examples = ['想吃辣的，20元以内，有点汤更好了', '想喝汤，不要辣', '便宜点，15元以内'];

  return (
    <>
      <TextInput
        style={styles.textarea}
        placeholder="说出你想吃的，如「想吃辣的，20元以内，有点汤更好了」"
        placeholderTextColor={colors.faint}
        value={text}
        onChangeText={setText}
        multiline
        onSubmitEditing={() => setSubmitted(text)}
        blurOnSubmit
      />
      <Pressable
        style={[styles.goBtn, !text.trim() && styles.goBtnDisabled]}
        disabled={!text.trim()}
        onPress={() => setSubmitted(text)}
      >
        <Text style={styles.goBtnText}>帮我找</Text>
      </Pressable>

      {results === null ? (
        <View style={styles.exampleBox}>
          <Text style={styles.hint}>试试这样说：</Text>
          {examples.map((ex) => (
            <Pressable
              key={ex}
              style={styles.chip}
              onPress={() => {
                setText(ex);
                setSubmitted(ex);
              }}
            >
              <Text style={styles.chipText}>{ex}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(s) => s.restaurantId}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListHeaderComponent={
            <Text style={styles.hint}>
              {loading ? '正在为你挑选…' : `按匹配度 + 到手价为你排序（共 ${results.length} 家）`}
            </Text>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>没有符合条件的选择，试着放宽预算或口味</Text>
          }
          renderItem={({ item, index }) => (
            <Pressable style={styles.row} onPress={() => onCompare(item.cart)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {index + 1}. {item.restaurantName}
                </Text>
                <Text style={styles.picked}>
                  推荐：{item.dishes.map((d) => d.name).join(' + ')}
                </Text>
                <Text style={styles.intentMeta}>
                  最低 {formatYuan(item.cheapest.final)} · {PLATFORM_LABELS[item.cheapest.platform]}
                  {item.maxSaving > 0 ? ` · 省 ${formatYuan(item.maxSaving)}` : ''}
                </Text>
              </View>
              <Text style={styles.cta}>比价 ›</Text>
            </Pressable>
          )}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 8 },
  subtitle: { fontSize: 14, color: colors.subtext, marginTop: 4, marginBottom: 12 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  segBtnActive: { backgroundColor: colors.card, ...shadow },
  segText: { fontSize: 14, fontWeight: '700', color: colors.faint },
  segTextActive: { color: colors.primary },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    color: colors.text,
  },
  textarea: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    color: colors.text,
    textAlignVertical: 'top',
  },
  goBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 14,
  },
  goBtnDisabled: { backgroundColor: colors.faint },
  goBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  exampleBox: { paddingTop: 4 },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.text, fontSize: 14 },
  hint: { fontSize: 13, color: colors.subtext, marginBottom: 10 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  cuisine: { fontSize: 13, color: colors.subtext, marginTop: 3 },
  picked: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 6 },
  intentMeta: { fontSize: 13, color: colors.good, fontWeight: '600', marginTop: 4 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 8 },
  chevron: { fontSize: 28, color: colors.faint, marginLeft: 8 },
  cta: { fontSize: 15, fontWeight: '700', color: colors.primary, marginLeft: 8 },
  empty: { textAlign: 'center', color: colors.faint, marginTop: 40 },
});
