import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  parseSmartQuery,
  searchAll,
  smartSearch,
  type Cart,
  type PriceProvider,
  type RestaurantSummary,
  type SmartMatch,
} from '@waimai/engine';
import { colors, shadow } from '../theme';
import { PlatformBadge } from '../components/PlatformBadge';

interface Props {
  providers: PriceProvider[];
  onSelect: (restaurantId: string) => void;
  /** Jump straight to the ranked comparison with a pre-built smart cart. */
  onCompare: (cart: Cart) => void;
}

export function SearchScreen({ providers, onSelect, onCompare }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RestaurantSummary[]>([]);
  const [smartResults, setSmartResults] = useState<SmartMatch[] | null>(null);

  useEffect(() => {
    let active = true;
    const smart = parseSmartQuery(query);
    if (smart && smart.include.length > 0) {
      smartSearch(providers, smart).then((matches) => {
        if (active) setSmartResults(matches);
      });
    } else {
      setSmartResults(null);
      searchAll(providers, query).then((hits) => {
        if (active) setResults(hits);
      });
    }
    return () => {
      active = false;
    };
  }, [providers, query]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>外卖比价</Text>
      <Text style={styles.subtitle}>一次搜索，比较各平台到手价</Text>

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
            <Text style={styles.smartHint}>智能点单：已按「要 / 不要」自动配好一份，点击直接比价</Text>
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
              <Text style={styles.compareCta}>比价 ›</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 8 },
  subtitle: { fontSize: 14, color: colors.subtext, marginTop: 4, marginBottom: 14 },
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
  smartHint: { fontSize: 13, color: colors.subtext, marginBottom: 10 },
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
  badges: { flexDirection: 'row', gap: 6, marginTop: 8 },
  chevron: { fontSize: 28, color: colors.faint, marginLeft: 8 },
  compareCta: { fontSize: 15, fontWeight: '700', color: colors.primary, marginLeft: 8 },
  empty: { textAlign: 'center', color: colors.faint, marginTop: 40 },
});
