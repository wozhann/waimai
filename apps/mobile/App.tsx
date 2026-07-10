import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { createDefaultProfile, createMockProviders, type Cart, type UserProfile } from '@waimai/engine';
import { colors } from './src/theme';
import { SearchScreen } from './src/screens/SearchScreen';
import { CartScreen } from './src/screens/CartScreen';
import { CompareScreen } from './src/screens/CompareScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

type Tab = 'compare' | 'profile';
type Flow =
  | { step: 'search' }
  | { step: 'cart'; restaurantId: string }
  | { step: 'results'; cart: Cart };

export default function App() {
  const providers = useMemo(() => createMockProviders(), []);
  const [profile, setProfile] = useState<UserProfile>(createDefaultProfile());
  const [tab, setTab] = useState<Tab>('compare');
  const [flow, setFlow] = useState<Flow>({ step: 'search' });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.body}>
        {tab === 'compare' ? (
          flow.step === 'search' ? (
            <SearchScreen
              providers={providers}
              onSelect={(restaurantId) => setFlow({ step: 'cart', restaurantId })}
            />
          ) : flow.step === 'cart' ? (
            <CartScreen
              restaurantId={flow.restaurantId}
              onBack={() => setFlow({ step: 'search' })}
              onCompare={(cart) => setFlow({ step: 'results', cart })}
            />
          ) : (
            <CompareScreen
              providers={providers}
              cart={flow.cart}
              profile={profile}
              onBack={() => setFlow({ step: 'cart', restaurantId: flow.cart.restaurantId })}
            />
          )
        ) : (
          <ProfileScreen profile={profile} setProfile={setProfile} />
        )}
      </View>

      <View style={styles.tabBar}>
        <TabButton label="比价" active={tab === 'compare'} onPress={() => setTab('compare')} />
        <TabButton label="我的" active={tab === 'profile'} onPress={() => setTab('profile')} />
      </View>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tabBtn} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingTop: 8 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 15, fontWeight: '600', color: colors.faint },
  tabTextActive: { color: colors.primary },
});
