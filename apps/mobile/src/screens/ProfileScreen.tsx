import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import {
  MEMBERSHIP_TIERS,
  PLATFORMS,
  PLATFORM_LABELS,
  SAMPLE_COUPONS,
  type MembershipTier,
  type Platform,
  type UserProfile,
} from '@waimai/engine';
import { colors, platformColor, shadow } from '../theme';
import { PlatformBadge } from '../components/PlatformBadge';

interface Props {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
}

const TIER_LABEL: Record<MembershipTier, string> = {
  none: '非会员',
  member: '会员',
  premium: '超级会员',
};

export function ProfileScreen({ profile, setProfile }: Props) {
  const setTier = (platform: Platform, tier: MembershipTier) =>
    setProfile({ ...profile, memberships: { ...profile.memberships, [platform]: tier } });

  const toggleCoupon = (couponId: string, on: boolean) => {
    const coupon = SAMPLE_COUPONS.find((c) => c.id === couponId)!;
    const coupons = on
      ? [...profile.coupons, coupon]
      : profile.coupons.filter((c) => c.id !== couponId);
    setProfile({ ...profile, coupons });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.title}>我的</Text>
      <Text style={styles.subtitle}>
        设置各平台会员与优惠券，比价结果会据此计算你的专属到手价
      </Text>

      <Text style={styles.section}>会员等级</Text>
      {PLATFORMS.map((platform) => (
        <View key={platform} style={styles.card}>
          <PlatformBadge platform={platform} />
          <View style={styles.tierRow}>
            {MEMBERSHIP_TIERS.map((tier) => {
              const active = profile.memberships[platform] === tier;
              return (
                <Pressable
                  key={tier}
                  onPress={() => setTier(platform, tier)}
                  style={[
                    styles.tierPill,
                    active && { backgroundColor: platformColor(platform), borderColor: platformColor(platform) },
                  ]}
                >
                  <Text style={[styles.tierText, active && styles.tierTextActive]}>
                    {TIER_LABEL[tier]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Text style={styles.section}>我的优惠券</Text>
      {SAMPLE_COUPONS.map((coupon) => {
        const on = profile.coupons.some((c) => c.id === coupon.id);
        return (
          <View key={coupon.id} style={[styles.card, styles.couponRow]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.couponLabel}>{coupon.label}</Text>
              <Text style={styles.couponSub}>{PLATFORM_LABELS[coupon.platform]}</Text>
            </View>
            <Switch value={on} onValueChange={(v) => toggleCoupon(coupon.id, v)} />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 8 },
  subtitle: { fontSize: 13, color: colors.subtext, marginTop: 4, marginBottom: 8, lineHeight: 19 },
  section: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 18, marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  tierRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tierPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  tierText: { fontSize: 14, fontWeight: '600', color: colors.subtext },
  tierTextActive: { color: '#fff' },
  couponRow: { flexDirection: 'row', alignItems: 'center' },
  couponLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  couponSub: { fontSize: 12, color: colors.subtext, marginTop: 3 },
});
