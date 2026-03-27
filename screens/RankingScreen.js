import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RankingScreen() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarRanking();
  }, []);

 async function cargarRanking() {
  try {
    const { data, error } = await supabase
      .from('ranking_view')
      .select('*');
    if (error) alert('Error: ' + error.message);
    else setRanking(data);
  } catch (e) {
    alert('Error: ' + e.message);
  }
  setLoading(false);
}

  const medallas = ['🥇', '🥈', '🥉'];

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#2e7d32" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>⚽ Quiniela Mundial 2026</Text>
        <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.salirBtn}>
          <Text style={styles.salirTxt}>Salir</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={ranking}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item, index }) => (
          <View style={[styles.row, index === 0 && styles.gold, index === 1 && styles.silver, index === 2 && styles.bronze]}>
            <Text style={styles.pos}>{medallas[index] || index + 1}</Text>
            <Text style={styles.nombre}>{item.nombre}</Text>
            <Text style={styles.puntos}>{item.puntos}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2e7d32', padding: 20, alignItems: 'center' },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  salirBtn: { position: 'absolute', right: 16, top: 20 },
  salirTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, marginHorizontal: 12, marginTop: 8, borderRadius: 10 },
  gold: { borderLeftWidth: 4, borderLeftColor: '#fbc02d', backgroundColor: '#fffde7' },
  silver: { borderLeftWidth: 4, borderLeftColor: '#9e9e9e', backgroundColor: '#f5f5f5' },
  bronze: { borderLeftWidth: 4, borderLeftColor: '#ff8f00', backgroundColor: '#fff8e1' },
  pos: { fontSize: 20, width: 40 },
  nombre: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#333' },
  puntos: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
});