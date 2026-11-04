import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>APP GAMES</Text>
      <Text style={styles.title}>Bereit für die erste Spielidee.</Text>
      <Text style={styles.subtitle}>
        Die technische Basis läuft. Als Nächstes entscheiden wir, was gespielt wird.
      </Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#111827',
  },
  eyebrow: {
    marginBottom: 16,
    color: '#67e8f9',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 4,
  },
  title: {
    maxWidth: 520,
    color: '#f9fafb',
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 480,
    marginTop: 18,
    color: '#9ca3af',
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
  },
});
