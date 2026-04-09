import { Component, ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { HatchPilotApp } from './src/HatchPilotApp';
import { FirebaseProvider } from './src/providers/FirebaseProvider';
import { colors } from './src/theme';

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message?: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>MK Hatch Pilot hit a startup issue</Text>
          <Text style={styles.errorText}>
            {this.state.message ?? 'The app ran into an unexpected problem while opening.'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appFrame}>
        <AppErrorBoundary>
          <FirebaseProvider>
            <HatchPilotApp />
          </FirebaseProvider>
        </AppErrorBoundary>
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
  errorCard: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  errorText: {
    color: colors.mutedText,
    fontSize: 16,
    lineHeight: 24,
  },
});
