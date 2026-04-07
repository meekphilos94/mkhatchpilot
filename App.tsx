import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, View } from 'react-native';

import { HatchPilotApp } from './src/HatchPilotApp';
import { colors } from './src/theme';

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appFrame}>
        <HatchPilotApp />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.shell,
  },
  appFrame: {
    flex: 1,
  },
});
