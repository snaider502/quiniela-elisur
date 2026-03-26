import { View, Text, StyleSheet } from 'react-native';

export default function ReglasScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.texto}>📜 Reglas - Próximamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' },
  texto: { fontSize: 18, color: '#2e7d32', fontWeight: 'bold' }
});