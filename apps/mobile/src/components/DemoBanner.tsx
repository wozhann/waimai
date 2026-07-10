import { StyleSheet, Text, View } from 'react-native';

/** Always-visible notice that every price in the app is locally simulated. */
export function DemoBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        演示模式 · 所有价格为本地模拟数据，非实时真实价格
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF4E5',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  text: {
    color: '#8A5300',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
